import EventEmitter from 'events';

import WorkerSubscription, { EVENT } from '../WorkerSubscription';
import Source from '../Source';

jest.mock('../WorkerSubscription');

jest.mock('plugin', () => ({}), { virtual: true });

describe('GIVEN Source', () => {
  test('THEN it should instantiate correctly', () => {
    expect(
      new Source({
        modulePath: 'source-module-path'
      })
    ).toBeDefined();
  });

  test('THEN sources should get a unique id', () => {
    expect(
      typeof new Source({
        modulePath: 'source-module-path'
      }).id
    ).toEqual('symbol');
    expect(
      new Source({
        modulePath: 'source-module-path'
      }).id
    ).not.toBe(
      new Source({
        modulePath: 'source-module-path'
      }).id
    );
  });

  test('THEN it should have a use method', () => {
    expect(
      new Source({
        modulePath: 'source-module-path'
      })
    ).toHaveProperty('use');
  });

  test('THEN it should have an onStart method', () => {
    expect(
      new Source({
        modulePath: 'source-module-path'
      })
    ).toHaveProperty('onStart');
  });

  test('THEN it should have a start method', () => {
    expect(
      new Source({
        modulePath: 'source-module-path'
      })
    ).toHaveProperty('start');
  });

  test('THEN it should have a stop method', () => {
    expect(
      new Source({
        modulePath: 'source-module-path'
      })
    ).toHaveProperty('stop');
  });

  test('THEN it should have a onUpdate method', () => {
    expect(
      new Source({
        modulePath: 'source-module-path'
      })
    ).toHaveProperty('onUpdate');
  });

  test('THEN it should have a onError method', () => {
    expect(
      new Source({
        modulePath: 'source-module-path'
      })
    ).toHaveProperty('onError');
  });

  describe('WHEN calling `use`', () => {
    let source: Source;

    beforeEach(async () => {
      source = new Source({
        modulePath: 'source-module-path'
      });

      source.use([{ modulePath: 'plugin', filter: /$/, options: { plugin: true } }]);
      await source.start({});
    });

    test('THEN the plugins should be passed to the worker', async () => {
      expect(WorkerSubscription).toHaveBeenCalledWith({
        plugins: [{ modulePath: 'plugin', options: { plugin: true }, filter: /$/ }],
        modulePath: 'source-module-path',
        options: {}
      });
    });
  });

  describe('WHEN calling `start`', () => {
    let source: Source;
    beforeEach(() => {
      source = new Source({
        modulePath: 'source-module-path',
        options: { primary: true }
      });
      source.use([]);
      (WorkerSubscription as jest.MockedFunction<any>).mockClear();
    });

    test('THEN the options should be merged', async () => {
      await source.start({ secondary: true });
      expect(WorkerSubscription).toHaveBeenCalledWith({
        plugins: [],
        modulePath: 'source-module-path',
        options: { primary: true, secondary: true }
      });
    });

    test('THEN the child worker should be created', async () => {
      await source.start({});
      expect(WorkerSubscription).toHaveBeenCalledWith({
        plugins: [],
        modulePath: 'source-module-path',
        options: { primary: true }
      });
    });
  });

  describe('WHEN calling `stop`', () => {
    let source;
    let workerSubscriptionSingletonMock;

    afterEach(() => {
      (WorkerSubscription as jest.MockedFunction<any>).mockRestore();
    });
    beforeEach(async () => {
      workerSubscriptionSingletonMock = {
        stop: jest.fn(),
        closed: false,
        on() {},
        once() {}
      };
      (WorkerSubscription as jest.MockedFunction<any>).mockImplementation(
        () => workerSubscriptionSingletonMock
      );
      source = new Source({
        modulePath: 'source-module-path'
      });
      source.start();
    });
    test('THEN the worker should throw if the source has not started', () => {
      source.stop();
      expect(workerSubscriptionSingletonMock.stop).toHaveBeenCalled();
      workerSubscriptionSingletonMock.closed = true;
      expect(() => source.stop()).toThrow(new Error('Cannot stop source that has not started'));
      expect(workerSubscriptionSingletonMock.stop).toHaveBeenCalledTimes(1);
    });
    test('THEN the worker should be closed', () => {
      source.stop();
      expect(workerSubscriptionSingletonMock.stop).toHaveBeenCalled();
    });
  });

  describe('WHEN events fire', () => {
    const workerHandlers: {
      exit: (code: number) => void;
      start: () => void;
      message: (data) => void;
      error: (error: Error) => void;
    } = {
      exit: null,
      start: null,
      message: null,
      error: null
    };
    let source;

    afterEach(() => {
      (WorkerSubscription.prototype.on as jest.MockedFunction<any>).mockRestore();
      (WorkerSubscription.prototype.once as jest.MockedFunction<any>).mockRestore();
    });
    beforeEach(async () => {
      const eventMap = {
        [EVENT.UPDATE]: 'message',
        [EVENT.EXIT]: 'exit',
        [EVENT.ERROR]: 'error',
        [EVENT.START]: 'start'
      };
      jest
        .spyOn(WorkerSubscription.prototype, 'on')
        .mockImplementation(function on(event: EVENT, handler) {
          workerHandlers[eventMap[event]] = handler;
          return this as EventEmitter;
        } as any);
      jest
        .spyOn(WorkerSubscription.prototype, 'once')
        .mockImplementation(function on(event: EVENT, handler) {
          workerHandlers[eventMap[event]] = handler;
          return this as EventEmitter;
        } as any);

      source = new Source({
        modulePath: 'source-module-path'
      });
      source.filesystem.reset = jest.fn();

      await source.start();
    });

    describe('AND exceptions occur', () => {
      test('THEN the worker should clear the filesystem on exit', () => {
        workerHandlers.exit(1);
        expect(source.filesystem.reset).toHaveBeenCalled();
      });
      test('THEN the worker should remove listeners on exit', () => {
        spyOn(EventEmitter.prototype, 'removeAllListeners');
        workerHandlers.exit(1);
        expect(EventEmitter.prototype.removeAllListeners).toHaveBeenCalled();
      });
      test('THEN start handler should only fire once', () => {
        const startSpy = jest.fn();
        source.onStart(startSpy);
        workerHandlers.start();
        workerHandlers.start();
        expect(startSpy).toHaveBeenCalledTimes(1);
      });
      test('THEN exit handler should only fire once', () => {
        const exitSpy = jest.fn();
        source.onExit(exitSpy);
        workerHandlers.exit(0);
        workerHandlers.exit(0);
        expect(exitSpy).toHaveBeenCalledTimes(1);
      });
      test('THEN error handler should only fire once', () => {
        const errorSpy = jest.fn();
        source.onError(errorSpy);
        workerHandlers.error(new Error('an exception that should only trigger an event once'));
        workerHandlers.error(new Error('an exception that should only trigger an event once'));
        expect(errorSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('AND event handlers are attached', () => {
      test('THEN the update handler should return a cleanup function', async () => {
        const updateSpy = jest.fn();
        const cleanup = source.onUpdate(updateSpy);
        cleanup();
        workerHandlers.message({ data: 'test', type: 'message' });
        await new Promise(resolve => setTimeout(resolve));
        expect(updateSpy).not.toHaveBeenCalled();
      });
      test('THEN the error handler should return a cleanup function', async () => {
        const errorSpy = jest.fn();
        const cleanup = source.onError(errorSpy);
        cleanup();
        workerHandlers.error(new Error('something broke'));
        await new Promise(resolve => setTimeout(resolve));
        expect(errorSpy).not.toHaveBeenCalled();
      });
      test('THEN the update handler should be fired on a message', async () => {
        const updateSpy = jest.fn();
        source.onUpdate(updateSpy);
        workerHandlers.message({
          data: { content: ['test'], meta: {}, data: {} },
          type: 'message'
        });
        await new Promise(resolve => setTimeout(resolve));
        expect(updateSpy).toHaveBeenCalledWith({ filesystem: source.filesystem, data: {} });
      });

      test('THEN the exit handler should unsubscribe all other handlers', async () => {
        const exitSpy = jest.fn();
        const errorSpy = jest.fn();
        const updateSpy = jest.fn();
        const startSpy = jest.fn();
        source.onError(errorSpy);
        source.onExit(exitSpy);
        source.onStart(startSpy);
        source.onUpdate(updateSpy);
        workerHandlers.exit(0);
        workerHandlers.error(new Error('i should never be handled'));
        workerHandlers.message('i should be ignored');
        workerHandlers.start();
        expect(exitSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy).not.toHaveBeenCalled();
        expect(startSpy).not.toHaveBeenCalled();
        expect(updateSpy).not.toHaveBeenCalled();
      });

      test('THEN the start handler should be fired when a worker received a start event', () => {
        const startSpy = jest.fn();
        source.onStart(startSpy);
        workerHandlers.start();
        expect(startSpy).toHaveBeenCalledTimes(1);
      });

      test('THEN the exit handler should be fired when the exit event emits', () => {
        const exitSpy = jest.fn();
        source.onExit(exitSpy);
        workerHandlers.exit(1);
        expect(exitSpy).toHaveBeenCalledTimes(1);
      });

      test('THEN the error handler should be fired on an error', () => {
        const error = new Error('something broke');
        const errorSpy = jest.fn();
        source.onError(errorSpy);
        workerHandlers.error(error);
        expect(errorSpy).toHaveBeenCalledWith(error);
      });
    });
  });
});
