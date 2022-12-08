import EventEmitter from 'events';
import { Worker } from 'node:worker_threads';

import WorkerSubscription, { EVENT } from '../WorkerSubscription';

jest.mock('node:worker_threads');

const utf8Encoder = new TextEncoder();

describe('GIVEN WorkerSubscription', () => {
  let subscription: WorkerSubscription;

  beforeEach(() => {
    subscription = new WorkerSubscription({
      modulePath: 'module',
      plugins: [],
      options: { primary: true }
    });
  });

  describe('WHEN calling `stop`', () => {
    beforeEach(() => {
      jest.spyOn(Worker.prototype, 'terminate');
      subscription = new WorkerSubscription({
        modulePath: 'module',
        options: {},
        plugins: []
      });
    });
    afterEach(() => {
      (Worker.prototype.terminate as jest.MockedFunction<any>).mockRestore();
    });
    test('THEN the worker should throw if the source is already stopped', async () => {
      subscription.stop();
      expect(() => subscription.stop()).toThrow(
        new Error('Cannot stop source - subscription is already closed')
      );
    });
    test('THEN the worker should be closed', () => {
      subscription.stop();
      expect(Worker.prototype.terminate).toHaveBeenCalledTimes(1);
    });
  });

  describe('WHEN events fire', () => {
    const workerHandlers: {
      exit: (code: number) => void;
      message: ({ type, data }: { type: string; data: string }) => void;
      error: (error: Error) => void;
    } = {
      exit: null,
      message: null,
      error: null
    };

    afterEach(() => {
      (Worker.prototype.on as jest.MockedFunction<any>).mockRestore();
      (Worker.prototype.once as jest.MockedFunction<any>).mockRestore();
      (Worker.prototype.terminate as jest.MockedFunction<any>).mockRestore();
    });
    beforeEach(() => {
      jest.spyOn(Worker.prototype, 'terminate');
      jest.spyOn(Worker.prototype, 'on').mockImplementation(function on(event: EVENT, handler) {
        workerHandlers[event] = handler;
        return this as EventEmitter;
      } as any);
      jest.spyOn(Worker.prototype, 'once').mockImplementation(function on(event: EVENT, handler) {
        workerHandlers[event] = handler;
        return this as EventEmitter;
      } as any);
      subscription = new WorkerSubscription({
        modulePath: 'module',
        options: {},
        plugins: []
      });
    });

    describe('AND exceptions occur', () => {
      beforeEach(() => {
        (Worker.prototype.terminate as jest.MockedFunction<any>).mockClear();
      });
      test('THEN the worker should terminate on exit event', () => {
        workerHandlers.exit(0);
        expect(Worker.prototype.terminate).toHaveBeenCalled();
      });
      test('THEN the worker should terminate on errors', () => {
        workerHandlers.error(new Error('something broke'));
        expect(Worker.prototype.terminate).toHaveBeenCalled();
      });
      test('THEN start handler should fire', () => {
        const startSpy = jest.fn();
        subscription.on(EVENT.START, startSpy);
        workerHandlers.message({ data: utf8Encoder.encode('{ "key": "value"}'), type: 'init' });
        workerHandlers.message({ data: utf8Encoder.encode('{ "key": "value"}'), type: 'init' });
        expect(startSpy).toHaveBeenCalledTimes(2);
      });
      test('THEN exit handler should only fire once', () => {
        const exitSpy = jest.fn();
        subscription.on(EVENT.EXIT, exitSpy);
        workerHandlers.exit(0);
        workerHandlers.exit(0);
        expect(exitSpy).toHaveBeenCalledTimes(1);
      });
      test('THEN error handler should only fire once', () => {
        const errorSpy = jest.fn();
        subscription.on(EVENT.ERROR, errorSpy);
        workerHandlers.error(new Error('an exception that should only trigger an event once'));
        workerHandlers.error(new Error('an exception that should only trigger an event once'));
        expect(errorSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('AND event handlers are attached', () => {
      test('THEN the update handler should return a cleanup function', () => {
        const updateSpy = jest.fn();
        const cleanup = subscription.on(EVENT.UPDATE, updateSpy);
        cleanup();
        workerHandlers.message({ data: utf8Encoder.encode('{ "key": "value"}'), type: 'message' });
        expect(updateSpy).not.toHaveBeenCalled();
      });
      test('THEN the error handler should return a cleanup function', () => {
        const errorSpy = jest.fn();
        const cleanup = subscription.on(EVENT.ERROR, errorSpy);
        cleanup();
        workerHandlers.error(new Error('something broke'));
        expect(errorSpy).not.toHaveBeenCalled();
      });
      test('THEN the update handler should be fired ONCE for a once message handler', () => {
        const updateSpy = jest.fn();
        subscription.once(EVENT.UPDATE, updateSpy);
        workerHandlers.message({ type: 'message', data: utf8Encoder.encode('{ "key": "value"}') });
        workerHandlers.message({ type: 'message', data: utf8Encoder.encode('{ "key": "value"}') });
        expect(updateSpy).toHaveBeenCalledTimes(1);
      });
      test('THEN the update handler should be fired on a message', () => {
        const updateSpy = jest.fn();
        subscription.on(EVENT.UPDATE, updateSpy);
        workerHandlers.message({ type: 'message', data: utf8Encoder.encode('{ "key": "value"}') });
        expect(updateSpy).toHaveBeenCalledWith({ data: { key: 'value' } });
      });

      test('THEN `stop` should unsubscribe all handlers', () => {
        const exitSpy = jest.fn();
        const errorSpy = jest.fn();
        const updateSpy = jest.fn();
        const startSpy = jest.fn();
        subscription.on(EVENT.ERROR, errorSpy);
        subscription.on(EVENT.EXIT, exitSpy);
        subscription.on(EVENT.START, startSpy);
        subscription.on(EVENT.UPDATE, updateSpy);
        subscription.stop();
        workerHandlers.error(new Error('i should never be handled'));
        workerHandlers.message({ type: 'init', data: utf8Encoder.encode('{ "key": "value"}') });
        workerHandlers.message({ type: 'message', data: utf8Encoder.encode('{ "key": "value"}') });
        workerHandlers.exit(0);
        expect(exitSpy).toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
        expect(updateSpy).not.toHaveBeenCalled();
        expect(startSpy).not.toHaveBeenCalled();
      });

      test('THEN the error handler should unsubscribe all other handlers and invoke exit', async () => {
        const exitSpy = jest.fn();
        const errorSpy = jest.fn();
        subscription.on(EVENT.ERROR, errorSpy);
        subscription.on(EVENT.EXIT, exitSpy);
        workerHandlers.error(new Error('some error'));
        workerHandlers.exit(0);
        workerHandlers.error(new Error('i should never be handled'));
        expect(exitSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy).toHaveBeenCalledTimes(1);
      });

      test('THEN the exit handler should unsubscribe all other handlers', async () => {
        const exitSpy = jest.fn();
        const errorSpy = jest.fn();
        const updateSpy = jest.fn();
        const startSpy = jest.fn();
        subscription.on(EVENT.ERROR, errorSpy);
        subscription.on(EVENT.EXIT, exitSpy);
        subscription.on(EVENT.START, startSpy);
        subscription.on(EVENT.UPDATE, updateSpy);
        workerHandlers.exit(0);
        workerHandlers.error(new Error('i should never be handled'));
        workerHandlers.message({ type: 'message', data: 'i should be ignored' });
        workerHandlers.message({ data: utf8Encoder.encode('{ "key": "value"}'), type: 'init' });
        expect(exitSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy).not.toHaveBeenCalled();
        expect(startSpy).not.toHaveBeenCalled();
        expect(updateSpy).not.toHaveBeenCalled();
      });

      test('THEN an exception should throw for an invalid signal', async () => {
        const errorSpy = jest.fn();
        subscription.on(EVENT.ERROR, errorSpy);
        const updateSpy = jest.fn();
        subscription.on(EVENT.UPDATE, updateSpy);
        workerHandlers.message({ data: 'something', type: 'invalid-signal' });
        workerHandlers.message({ data: 'should-not-be-received', type: 'message' });
        expect(errorSpy).toHaveBeenCalledWith(
          new Error(
            "Unsupported type 'invalid-signal' with value of 'something' received from source worker."
          )
        );
        expect(updateSpy).not.toHaveBeenCalled();
      });

      test('THEN the start handler should be fired when a worker received an init signal', () => {
        const startSpy = jest.fn();
        subscription.on(EVENT.START, startSpy);
        workerHandlers.message({ data: utf8Encoder.encode('{ "key": "value"}'), type: 'init' });
        expect(startSpy).toHaveBeenCalledTimes(1);
      });

      test('THEN the exit handler should be fired when a worker emits an error', () => {
        const exitSpy = jest.fn();
        subscription.on(EVENT.EXIT, exitSpy);
        workerHandlers.error(new Error('an exception that should cause an exit'));
        expect(exitSpy).toHaveBeenCalledTimes(1);
      });

      test('THEN the exit handler should be fired when a worker emits an error (exit code > 0)', () => {
        const exitSpy = jest.fn();
        subscription.on(EVENT.EXIT, exitSpy);
        const errorSpy = jest.fn();
        subscription.on(EVENT.ERROR, errorSpy);
        workerHandlers.exit(1);
        expect(errorSpy).toHaveBeenCalledWith(new Error('mosaic source stopped with exit code 1'));
        expect(exitSpy).toHaveBeenCalledTimes(1);
      });

      test('THEN the exit handler should be fired when a worker is complete', () => {
        const exitSpy = jest.fn();
        subscription.on(EVENT.EXIT, exitSpy);
        workerHandlers.exit(0);
        expect(exitSpy).toHaveBeenCalledTimes(1);
      });

      test('THEN the error handler should be fired on an error', () => {
        const error = new Error('something broke');
        const errorSpy = jest.fn();
        subscription.on(EVENT.ERROR, errorSpy);
        workerHandlers.error(error);
        expect(errorSpy).toHaveBeenCalledWith(error);
      });
    });
  });

  test('THEN it should instantiate correctly', () => {
    expect(
      new WorkerSubscription({
        modulePath: 'module',
        options: {},
        plugins: []
      })
    ).toBeDefined();
  });

  test('THEN it should have a once method', () => {
    expect(
      new WorkerSubscription({
        modulePath: 'module',
        options: {},
        plugins: []
      })
    ).toHaveProperty('once');
  });

  test('THEN it should have a on method', () => {
    expect(
      new WorkerSubscription({
        modulePath: 'module',
        options: {},
        plugins: []
      })
    ).toHaveProperty('on');
  });

  test('THEN it should have a close getter', () => {
    expect(
      new WorkerSubscription({
        modulePath: 'module',
        options: {},
        plugins: []
      })
    ).toHaveProperty('closed');
  });

  test('THEN it should have a stop method', () => {
    expect(
      new WorkerSubscription({
        modulePath: 'module',
        options: {},
        plugins: []
      })
    ).toHaveProperty('stop');
  });

  test('THEN the child worker should be created', () => {
    expect(Worker).toHaveBeenCalledWith(expect.any(String), {
      workerData: {
        plugins: [],
        modulePath: 'module',
        options: { primary: true }
      }
    });
  });
});
