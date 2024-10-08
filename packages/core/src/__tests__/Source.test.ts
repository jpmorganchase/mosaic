import { describe, expect, test, vi, beforeEach, afterEach, MockedFunction } from 'vitest';
import EventEmitter from 'events';

import WorkerSubscription, { EVENT } from '../WorkerSubscription';
import Source from '../Source';

vi.mock('../WorkerSubscription');
vi.mock('plugin', () => ({}));
vi.mock('../plugin/createPluginAPI.js');

const utf8Encoder = new TextEncoder();

describe('GIVEN Source', () => {
  test('THEN it should instantiate correctly', () => {
    expect(
      new Source({
        modulePath: 'plugin',
        namespace: 'test-namespace'
      })
    ).toBeDefined();
  });

  test('THEN sources should get a unique id', () => {
    expect(
      typeof new Source({
        modulePath: 'plugin',
        namespace: 'test-namespace'
      }).id
    ).toEqual('symbol');
    expect(
      new Source({
        modulePath: 'plugin',
        namespace: 'test-namespace'
      }).id
    ).not.toBe(
      new Source({
        modulePath: 'plugin',
        namespace: 'test-namespace'
      }).id
    );
  });

  test('THEN it should have a use method', () => {
    expect(
      new Source({
        modulePath: 'plugin',
        namespace: 'test-namespace'
      })
    ).toHaveProperty('use');
  });

  test('THEN it should have an onStart method', () => {
    expect(
      new Source({
        modulePath: 'plugin',
        namespace: 'test-namespace'
      })
    ).toHaveProperty('onStart');
  });

  test('THEN it should have a start method', () => {
    expect(
      new Source({
        modulePath: 'plugin',
        namespace: 'test-namespace'
      })
    ).toHaveProperty('start');
  });

  test('THEN it should have a stop method', () => {
    expect(
      new Source({
        modulePath: 'plugin',
        namespace: 'test-namespace'
      })
    ).toHaveProperty('stop');
  });

  test('THEN it should have a onUpdate method', () => {
    expect(
      new Source({
        modulePath: 'plugin',
        namespace: 'test-namespace'
      })
    ).toHaveProperty('onUpdate');
  });

  test('THEN it should have a onError method', () => {
    expect(
      new Source({
        modulePath: 'plugin',
        namespace: 'test-namespace'
      })
    ).toHaveProperty('onError');
  });

  test('THEN it should have a isOwner method', () => {
    expect(
      new Source({
        modulePath: 'plugin',
        namespace: 'test-namespace'
      })
    ).toHaveProperty('isOwner');
  });

  test('THEN it should have a triggerWorkflow method', () => {
    expect(
      new Source({
        modulePath: 'plugin',
        namespace: 'test-namespace'
      })
    ).toHaveProperty('triggerWorkflow');
  });

  describe('WHEN calling `use`', () => {
    let source: Source;

    beforeEach(async () => {
      source = new Source({
        modulePath: 'plugin',
        namespace: 'test-namespace'
      });

      source.use([{ modulePath: 'plugin', filter: /$/, options: { plugin: true } }]);
      await source.start();
    });

    test('THEN the plugins should be passed to the worker', async () => {
      expect(WorkerSubscription).toHaveBeenCalledWith({
        ignorePages: undefined,
        plugins: [{ modulePath: 'plugin', options: { plugin: true }, filter: /$/ }],
        modulePath: 'plugin',
        name: expect.stringMatching(/#5e543256/),
        namespace: 'test-namespace',
        options: undefined,
        pageExtensions: undefined,
        serialisers: []
      });
    });
  });

  describe('WHEN calling `start`', () => {
    let source: Source;
    beforeEach(() => {
      source = new Source(
        {
          modulePath: 'plugin',
          namespace: 'test-namespace'
        },
        { primary: true }
      );
      source.use([]);
      (WorkerSubscription as MockedFunction<any>).mockClear();
    });

    test('THEN the child worker should be created', async () => {
      await source.start();
      expect(WorkerSubscription).toHaveBeenCalledWith({
        ignorePages: undefined,
        modulePath: 'plugin',
        namespace: 'test-namespace',
        name: expect.stringMatching(/#c7b08e60/),
        options: { primary: true },
        pageExtensions: undefined,
        plugins: [],
        serialisers: []
      });
    });
  });

  describe('WHEN calling `stop`', () => {
    let source: Source;
    let workerSubscriptionSingletonMock: typeof WorkerSubscription;

    afterEach(() => {
      (WorkerSubscription as MockedFunction<any>).mockRestore();
    });
    beforeEach(async () => {
      workerSubscriptionSingletonMock = {
        stop: vi.fn(),
        closed: false,
        on() {},
        once() {}
      };
      (WorkerSubscription as MockedFunction<any>).mockImplementation(
        () => workerSubscriptionSingletonMock
      );
      source = new Source({
        modulePath: 'plugin',
        namespace: 'test-namespace'
      });
      await source.start();
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
      message: (data: unknown) => void;
      error: (error: Error) => void;
    } = {
      exit: () => {},
      start: () => {},
      message: () => {},
      error: () => {}
    };
    let source: Source;

    afterEach(() => {
      (WorkerSubscription.prototype.on as MockedFunction<any>).mockRestore();
      (WorkerSubscription.prototype.once as MockedFunction<any>).mockRestore();
    });
    beforeEach(async () => {
      const eventMap: Record<keyof EVENT, 'message' | 'exit' | 'error' | 'start'> = {
        [EVENT.UPDATE]: 'message',
        [EVENT.EXIT]: 'exit',
        [EVENT.ERROR]: 'error',
        [EVENT.START]: 'start'
      };
      vi.spyOn(WorkerSubscription.prototype, 'on').mockImplementation(function on(
        this: EventEmitter,
        event: EVENT,
        handler: () => {}
      ) {
        workerHandlers[eventMap[event]] = handler;
        return this;
      } as any);
      vi.spyOn(WorkerSubscription.prototype, 'once').mockImplementation(function on(
        this: EventEmitter,
        event: EVENT,
        handler: () => {}
      ) {
        workerHandlers[eventMap[event]] = handler;
        return this;
      } as any);

      source = new Source({
        modulePath: 'plugin',
        namespace: 'test-namespace'
      });
      source.filesystem.reset = vi.fn();

      await source.start();
    });

    describe('AND exceptions occur', () => {
      test('THEN the worker should clear the filesystem on exit', () => {
        workerHandlers.exit(1);
        expect(source.filesystem).toEqual(null);
      });
      test('THEN the worker should remove listeners on exit', () => {
        vi.spyOn(EventEmitter.prototype, 'removeAllListeners');
        workerHandlers.exit(1);
        expect(EventEmitter.prototype.removeAllListeners).toHaveBeenCalled();
      });
      test('THEN start handler should only fire once', () => {
        const startSpy = vi.fn();
        source.onStart(startSpy);
        workerHandlers.start();
        workerHandlers.start();
        expect(startSpy).toHaveBeenCalledTimes(1);
      });
      test('THEN exit handler should only fire once', () => {
        const exitSpy = vi.fn();
        source.onExit(exitSpy);
        workerHandlers.exit(0);
        workerHandlers.exit(0);
        expect(exitSpy).toHaveBeenCalledTimes(1);
      });
      test('THEN error handler should only fire once', () => {
        const errorSpy = vi.fn();
        source.onError(errorSpy);
        workerHandlers.error(new Error('an exception that should only trigger an event once'));
        workerHandlers.error(new Error('an exception that should only trigger an event once'));
        expect(errorSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('AND event handlers are attached', () => {
      test('THEN the update handler should return a cleanup function', async () => {
        const updateSpy = vi.fn();
        const cleanup = source.onUpdate(updateSpy);
        cleanup();
        workerHandlers.message({ data: utf8Encoder.encode("{ key : 'test' }"), type: 'message' });
        await new Promise(resolve => setTimeout(resolve));
        expect(updateSpy).not.toHaveBeenCalled();
      });
      test('THEN the error handler should return a cleanup function', async () => {
        const errorSpy = vi.fn();
        const cleanup = source.onError(errorSpy);
        cleanup();
        workerHandlers.error(new Error('something broke'));
        await new Promise(resolve => setTimeout(resolve));
        expect(errorSpy).not.toHaveBeenCalled();
      });
      test('THEN the update handler should be fired on a message', async () => {
        const updateSpy = vi.fn();
        source.onUpdate(updateSpy);
        workerHandlers.message({
          data: { content: ['test'], meta: {}, data: { testValue: 'someValue' } },
          type: 'message'
        });
        await new Promise(resolve => setTimeout(resolve));
        expect(updateSpy).toHaveBeenCalledWith({
          data: { testValue: 'someValue' },
          pages: undefined,
          symlinks: undefined
        });
      });

      test('THEN the exit handler should unsubscribe all other handlers', () => {
        const exitSpy = vi.fn();
        const errorSpy = vi.fn();
        const updateSpy = vi.fn();
        const startSpy = vi.fn();
        source.onError(errorSpy);
        source.onExit(exitSpy);
        source.onStart(startSpy);
        source.onUpdate(updateSpy);
        workerHandlers.exit(0);
        workerHandlers.error(new Error('i should never be handled'));
        workerHandlers.message({ data: 'i should be ignored' });
        workerHandlers.start();
        expect(exitSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy).not.toHaveBeenCalled();
        expect(startSpy).not.toHaveBeenCalled();
        expect(updateSpy).not.toHaveBeenCalled();
      });

      test('THEN the start handler should be fired when a worker received a start event', () => {
        const startSpy = vi.fn();
        source.onStart(startSpy);
        workerHandlers.start();
        expect(startSpy).toHaveBeenCalledTimes(1);
      });

      test('THEN the exit handler should be fired when the exit event emits', () => {
        const exitSpy = vi.fn();
        source.onExit(exitSpy);
        workerHandlers.exit(1);
        expect(exitSpy).toHaveBeenCalledTimes(1);
      });

      test('THEN the error handler should be fired on an error', () => {
        const error = new Error('something broke');
        const errorSpy = vi.fn();
        source.onError(errorSpy);
        workerHandlers.error(error);
        expect(errorSpy).toHaveBeenCalledWith(error);
      });
    });
  });

  describe('WHEN workflows are triggered', () => {
    let source: Source;
    const actionSpy = vi.fn();
    const sendWorkflowProgressMessageSpy = vi.fn();
    beforeEach(async () => {
      source = new Source(
        {
          modulePath: 'plugin',
          namespace: 'test-namespace'
        },
        { sourceOption: 'source option' },
        [],
        [],
        {},
        [
          {
            name: 'workflow-name',
            options: {
              workflowOption: 'workflow option'
            },
            action: actionSpy
          }
        ]
      );
      await source.start();
    });
    afterEach(() => {
      actionSpy.mockReset();
      sendWorkflowProgressMessageSpy.mockReset();
    });

    test('THEN the workflow action is called', () => {
      source.triggerWorkflow(sendWorkflowProgressMessageSpy, 'workflow-name', '/path/to/file', {
        data: { name: 'test' }
      });
      expect(actionSpy).toHaveBeenCalledTimes(1);
      expect(sendWorkflowProgressMessageSpy).toBeCalledTimes(0);
    });

    test('THEN the workflow action can access the source options', () => {
      source.triggerWorkflow(sendWorkflowProgressMessageSpy, 'workflow-name', '/path/to/file', {
        data: { name: 'test' }
      });
      expect(actionSpy.mock.calls[0][1]).toEqual({
        sourceOption: 'source option'
      });
    });

    test('THEN the workflow action can access the workflow options', () => {
      source.triggerWorkflow(sendWorkflowProgressMessageSpy, 'workflow-name', '/path/to/file', {
        data: { name: 'test' }
      });
      expect(actionSpy.mock.calls[0][2]).toEqual({
        workflowOption: 'workflow option'
      });
    });

    test('THEN the workflow action can access the filepath', () => {
      source.triggerWorkflow(sendWorkflowProgressMessageSpy, 'workflow-name', '/path/to/file', {
        data: { name: 'test' }
      });
      expect(actionSpy.mock.calls[0][3]).toEqual('/path/to/file');
    });

    test('THEN the workflow action can access the custom data object', () => {
      source.triggerWorkflow(sendWorkflowProgressMessageSpy, 'workflow-name', '/path/to/file', {
        data: { name: 'test' }
      });
      expect(actionSpy.mock.calls[0][4]).toEqual({ data: { name: 'test' } });
    });

    describe('AND WHEN there is no matching workflow', () => {
      test('THEN an error is sent', () => {
        source.triggerWorkflow(
          sendWorkflowProgressMessageSpy,
          'unknown-workflow',
          '/path/to/file',
          {
            data: { name: 'test' }
          }
        );
        expect(sendWorkflowProgressMessageSpy).toBeCalledTimes(1);
        expect(sendWorkflowProgressMessageSpy.mock.calls[0][0]).toContain(
          'unknown-workflow not found'
        );
        expect(sendWorkflowProgressMessageSpy.mock.calls[0][1]).toEqual('ERROR');
      });

      test('AND the action is not triggered', () => {
        source.triggerWorkflow(
          sendWorkflowProgressMessageSpy,
          'unknown-workflow',
          '/path/to/file',
          {
            data: { name: 'test' }
          }
        );
        expect(actionSpy).toHaveBeenCalledTimes(0);
      });
    });

    describe('AND WHEN there are multiple workflows with the same name', () => {
      beforeEach(async () => {
        source = new Source(
          {
            modulePath: 'plugin',
            namespace: 'test-namespace'
          },
          { sourceOption: 'source option' },
          [],
          [],
          {},
          [
            {
              name: 'workflow-name',
              options: {
                workflowOption: 'workflow option'
              },
              action: actionSpy
            },
            {
              name: 'workflow-name',
              options: {
                workflowOption: 'workflow option'
              },
              action: actionSpy
            }
          ]
        );
        await source.start();
      });
      test('THEN an error is sent', () => {
        source.triggerWorkflow(sendWorkflowProgressMessageSpy, 'workflow-name', '/path/to/file', {
          data: { name: 'test' }
        });
        expect(sendWorkflowProgressMessageSpy).toBeCalledTimes(1);
        expect(sendWorkflowProgressMessageSpy.mock.calls[0][0]).toContain(
          'multiple workflows with "workflow-name" found'
        );
        expect(sendWorkflowProgressMessageSpy.mock.calls[0][1]).toEqual('ERROR');
      });

      test('AND the action is not triggered', () => {
        source.triggerWorkflow(
          sendWorkflowProgressMessageSpy,
          'unknown-workflow',
          '/path/to/file',
          {
            data: { name: 'test' }
          }
        );
        expect(actionSpy).toHaveBeenCalledTimes(0);
      });
    });
  });
});
