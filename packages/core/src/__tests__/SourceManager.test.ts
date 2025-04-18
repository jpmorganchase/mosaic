import { describe, expect, test, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { debounce } from 'lodash-es';

import SourceManager from '../SourceManager';
import Source from '../Source';

vi.mock('../Source');
vi.mock('lodash-es');

function scheduleOnUpdateCallback(message) {
  setTimeout(() => {
    const onUpdateCallback = getLastUpdateCallback();
    onUpdateCallback(message);
  });
}
function scheduleOnStartCallback() {
  setTimeout(() => {
    const onStartCallback = getOnStartCallback();
    onStartCallback();
  });
}

function getOnStartCallback() {
  const onStartCallbackCalls = (Source.prototype.onStart as MockedFunction<any>).mock.calls;
  return onStartCallbackCalls[onStartCallbackCalls.length - 1][0];
}

function getLastUpdateCallback() {
  const onUpdateCallbackCalls = (Source.prototype.onUpdate as MockedFunction<any>).mock.calls;
  return onUpdateCallbackCalls[onUpdateCallbackCalls.length - 1][0];
}

describe('GIVEN SourceManager', () => {
  beforeEach(() => {
    (debounce as MockedFunction<any>).mockImplementation(
      callback =>
        (...args) =>
          setTimeout(() => callback(...args))
    );
  });
  test('THEN it should instantiate correctly', () => {
    expect(new SourceManager({}, {})).toBeDefined();
  });

  test('THEN it should have an addSource method', () => {
    expect(new SourceManager({}, {})).toHaveProperty('addSource');
  });

  test('THEN it should have an getSource method', () => {
    expect(new SourceManager({}, {})).toHaveProperty('getSource');
  });

  test('THEN it should have an destroyAll method', () => {
    expect(new SourceManager({}, {})).toHaveProperty('destroyAll');
  });

  test('THEN it should have an listSources method', () => {
    expect(new SourceManager({}, {})).toHaveProperty('listSources');
  });

  test('THEN it should have an getSourceDefinition method', () => {
    expect(new SourceManager({}, {})).toHaveProperty('getSourceDefinition');
  });

  test('THEN it should have an destroySource method', () => {
    expect(new SourceManager({}, {})).toHaveProperty('destroySource');
  });

  describe('WHEN destroying a source', () => {
    let sourceManager: SourceManager;

    beforeEach(() => {
      vi.spyOn(Source.prototype, 'onExit').mockReturnValue(vi.fn());
      vi.spyOn(Source.prototype, 'onError').mockReturnValue(vi.fn());
      vi.spyOn(Source.prototype, 'onUpdate').mockReturnValue(vi.fn());
      vi.spyOn(Source.prototype, 'onStart').mockReturnValue(vi.fn());
      vi.spyOn(Source.prototype, 'stop').mockReturnValue(vi.fn());

      sourceManager = new SourceManager({}, {});
    });

    afterEach(() => {
      (Source.prototype.stop as MockedFunction<any>).mockReset();
      (Source.prototype.onStart as MockedFunction<any>).mockReset();
    });

    test('THEN calling `destroyAll` should stop all sources', async () => {
      (Source.prototype as MockedFunction<any>).id = '1';
      scheduleOnStartCallback();
      await sourceManager.addSource({ modulePath: '1', name: '1' }, {});
      (Source.prototype as MockedFunction<any>).id = '2';
      scheduleOnStartCallback();
      await sourceManager.addSource({ modulePath: '2', name: '2' }, {});
      (Source.prototype as MockedFunction<any>).id = '3';
      scheduleOnStartCallback();
      await sourceManager.addSource({ modulePath: '3', name: '3' }, {});
      sourceManager.destroyAll();
      expect(Source.prototype.stop).toHaveBeenCalledTimes(3);
    });
  });

  describe('WHEN adding a source with plugins', () => {
    let sourceManager: SourceManager;
    beforeEach(async () => {
      Source.prototype.constructorSpy.mockReset();
      Source.prototype.use.mockReset();
      sourceManager = new SourceManager({}, {}, [{ options: { plugins: true } }]);
      scheduleOnStartCallback();
      await sourceManager.addSource({ name: 'source', modulePath: 'source-module' }, {});
    });
    test('THEN the plugins should be used', () => {
      expect(Source.prototype.use.mock.calls[0][0]).toEqual([{ options: { plugins: true } }]);
    });
    test('THEN the sources should be created for the new sources', async () => {
      scheduleOnStartCallback();
      await sourceManager.addSource(
        { name: 'source2', modulePath: 'source-module2', options: { a: true } },
        {}
      );
      expect(Source.prototype.constructorSpy.mock.calls[0][0]).toEqual({
        name: 'source',
        modulePath: 'source-module'
      });
      expect(Source.prototype.constructorSpy.mock.calls[1][0]).toEqual({
        name: 'source2',
        modulePath: 'source-module2',
        options: { a: true }
      });
    });
  });

  describe('WHEN adding a source', () => {
    let sourceManager: SourceManager;

    beforeEach(() => {
      Source.prototype.constructorSpy.mockReset();
      sourceManager = new SourceManager({}, {});
      vi.spyOn(Source.prototype, 'onExit').mockReturnValue(vi.fn());
      vi.spyOn(Source.prototype, 'onError').mockReturnValue(vi.fn());
      vi.spyOn(Source.prototype, 'onUpdate').mockReturnValue(vi.fn());
      vi.spyOn(Source.prototype, 'onStart').mockReturnValue(vi.fn());
      vi.spyOn(Source.prototype, 'stop').mockClear();
    });
    describe('AND the source changes', () => {
      describe("AND the source hasn't initialised yet", () => {
        test('THEN `onSourceUpdate` should not be called and an error should be thrown', async () => {
          const onSourceUpdateSpy = vi.fn();
          sourceManager.onSourceUpdate(onSourceUpdateSpy);
          const sourceCreatorPromise = sourceManager.addSource(
            { name: 'source', modulePath: 'source-module' },
            {}
          );

          const onUpdateCallbackCalls = (Source.prototype.onUpdate as MockedFunction<any>).mock
            .calls;
          const latestOnUpdateCallback = onUpdateCallbackCalls[onUpdateCallbackCalls.length - 1][0];
          expect(latestOnUpdateCallback).toBeDefined();
          latestOnUpdateCallback('message');

          await expect(() => sourceCreatorPromise).rejects.toThrow('message');
        });
      });

      test('THEN `onSourceUpdate` should be called', async () => {
        const onSourceUpdateSpy = vi.fn();
        sourceManager.onSourceUpdate(onSourceUpdateSpy);

        scheduleOnUpdateCallback('message');

        await expect(() =>
          sourceManager.addSource({ name: 'source2', modulePath: 'source2-module' }, {})
        ).rejects.toThrow(
          new Error("[Mosaic][Source] 'source2' received a message before it was initialised.")
        );
      });

      test('THEN `onSourceUpdate` should be called with a filesystem', async () => {
        const onSourceUpdateSpy = vi.fn();
        sourceManager.onSourceUpdate(onSourceUpdateSpy);
        scheduleOnStartCallback();
        await sourceManager.addSource({ name: 'source', modulePath: 'source-module' }, {});

        const latestOnUpdateCallback = getLastUpdateCallback();
        expect(latestOnUpdateCallback).toBeDefined();
        latestOnUpdateCallback(['message1', 'message1.2']);

        scheduleOnStartCallback();
        await sourceManager.addSource({ name: 'source', modulePath: 'source-module' }, {});

        await new Promise(resolve => setTimeout(resolve));
        expect(onSourceUpdateSpy.mock.calls[0][1].filesystem).toBeDefined();
      });
    });

    test('THEN the source should be available via `getSource`', async () => {
      scheduleOnStartCallback();
      const source1 = await sourceManager.addSource(
        { name: 'source', modulePath: 'source-module' },
        {}
      );
      scheduleOnStartCallback();
      await sourceManager.addSource({ name: 'source2', modulePath: 'source2-module' }, {});
      expect(sourceManager.getSource('source')).toBeDefined();
    });

    test('THEN the sources should be created for the new sources', async () => {
      scheduleOnStartCallback();
      await sourceManager.addSource(
        { name: 'source', modulePath: 'source-module', options: { a: true } },
        {}
      );
      scheduleOnStartCallback();
      await sourceManager.addSource(
        { name: 'source2', modulePath: 'source2-module', options: { b: true } },
        {}
      );

      expect(Source.prototype.constructorSpy.mock.calls[0][0]).toEqual({
        name: 'source',
        modulePath: 'source-module',
        options: { a: true }
      });
      expect(Source.prototype.constructorSpy.mock.calls[1][0]).toEqual({
        name: 'source2',
        modulePath: 'source2-module',
        options: { b: true }
      });
    });

    describe('AND an error is thrown or an early exit occurs', () => {
      beforeEach(() => {
        vi.spyOn(Source.prototype, 'onError').mockImplementation(() => vi.fn());
      });
      test('THEN an error should be reported for any early exit, as a rejected promise', async () => {
        setTimeout(() => {
          const onExitCallbackCalls = (Source.prototype.onExit as MockedFunction<any>).mock.calls;
          const latestOnExitCallback = onExitCallbackCalls[onExitCallbackCalls.length - 1][0];
          latestOnExitCallback();
        });
        await expect(() =>
          sourceManager.addSource({ name: 'source', modulePath: 'source-module' }, {})
        ).rejects.toThrow(
          new Error("[Mosaic][Source] 'source' silently exited before initialising.")
        );
      });
      test('THEN the error should be reported in a rejected promise', async () => {
        setTimeout(() => {
          const onErrorCallbackCalls = (Source.prototype.onError as MockedFunction<any>).mock.calls;
          const latestOnErrorCallback = onErrorCallbackCalls[onErrorCallbackCalls.length - 1][0];
          latestOnErrorCallback(new Error('some error'));
        });
        await expect(() =>
          sourceManager.addSource({ name: 'source', modulePath: 'source-module' }, {})
        ).rejects.toThrow(new Error('some error'));
      });
    });

    test('THEN it should call `start` on the Source', async () => {
      vi.spyOn(Source.prototype, 'start');
      scheduleOnStartCallback();
      await sourceManager.addSource({ name: 'source', modulePath: 'source-module' }, {});
      expect(Source.prototype.start).toHaveBeenCalled();
    });
  });

  describe('WHEN adding sources that are **NOT** scheduled', () => {
    let sourceManager: SourceManager;
    beforeEach(async () => {
      Source.prototype.constructorSpy.mockReset();
      sourceManager = new SourceManager({}, {}, [{ options: { plugins: true } }], [], [], [], {
        checkIntervalMins: 30,
        initialDelayMs: 1000
      });
      scheduleOnStartCallback();
      await sourceManager.addSource({ name: 'source', modulePath: 'source-module' }, {});
    });
    test('THEN the Source Manager applies a schedule', () => {
      expect(Source.prototype.constructorSpy).toBeCalledWith(
        {
          modulePath: 'source-module',
          name: 'source',
          schedule: { checkIntervalMins: 30, initialDelayMs: 1000 }
        },
        {},
        [],
        [],
        {},
        undefined
      );
    });
  });

  describe('WHEN adding sources that are scheduled', () => {
    let sourceManager: SourceManager;
    beforeEach(async () => {
      Source.prototype.constructorSpy.mockReset();
      sourceManager = new SourceManager({}, {}, [{ options: { plugins: true } }], [], [], [], {
        checkIntervalMins: 30,
        initialDelayMs: 1000
      });
      scheduleOnStartCallback();
      await sourceManager.addSource(
        {
          name: 'source',
          modulePath: 'source-module',
          schedule: { checkIntervalMins: 5, initialDelayMs: 5000 }
        },
        {}
      );
    });
    test('THEN the Source Manager applies the schedule from the source definition', () => {
      expect(Source.prototype.constructorSpy).toBeCalledWith(
        {
          modulePath: 'source-module',
          name: 'source',
          schedule: { checkIntervalMins: 5, initialDelayMs: 5000 }
        },
        {},
        [],
        [],
        {},
        undefined
      );
    });
  });

  describe('WHEN listing sources', () => {
    let sourceManager: SourceManager;
    beforeEach(async () => {
      Source.prototype.constructorSpy.mockReset();
      sourceManager = new SourceManager({}, {});
      scheduleOnStartCallback();
      await sourceManager.addSource({ name: 'source 1', modulePath: 'source-module' }, {});
      scheduleOnStartCallback();
      await sourceManager.addSource({ name: 'source 2', modulePath: 'source-module' }, {});
    });

    test('THEN all sources name and index is returned', () => {
      expect(sourceManager.listSources()).toEqual([
        { index: 0, name: 'source 1' },
        { index: 1, name: 'source 2' }
      ]);
    });
  });

  describe('WHEN getting a sources definition', () => {
    let sourceManager: SourceManager;
    beforeEach(async () => {
      Source.prototype.constructorSpy.mockReset();

      sourceManager = new SourceManager({}, {});
      scheduleOnStartCallback();
      await sourceManager.addSource({ name: 'source 1', modulePath: 'source-module' }, {});
      scheduleOnStartCallback();
      await sourceManager.addSource({ name: 'source 2', modulePath: 'source-module' }, {});
    });

    describe('AND a source name that exists is used', () => {
      test('THEN the source definition is returned', async () => {
        expect(await sourceManager.getSourceDefinition('source 1')).toEqual({
          name: 'source 1',
          modulePath: 'source-module'
        });
      });
    });

    describe('AND a source name that does **NOT** exist is used', () => {
      test('THEN undefined is returned', async () => {
        expect(await sourceManager.getSourceDefinition('source 3')).toBeUndefined();
      });
    });
  });

  describe('WHEN stopping a source', () => {
    let sourceManager: SourceManager;
    beforeEach(async () => {
      Source.prototype.constructorSpy.mockReset();

      sourceManager = new SourceManager({}, {});
      scheduleOnStartCallback();
      await sourceManager.addSource({ name: 'source 1', modulePath: 'source-module' }, {});
      scheduleOnStartCallback();
      await sourceManager.addSource({ name: 'source 2', modulePath: 'source-module' }, {});
    });

    describe('AND a source name that exists is used', () => {
      test('THEN the source is stopped', () => {
        sourceManager.destroySource('source 1');
        expect(Source.prototype.stop).toBeCalledTimes(1);
      });
    });

    describe('AND a source name that does **NOT** exist is used', () => {
      test('THEN the source is **NOT** restarted', () => {
        const stop = () => sourceManager.destroySource('source 3');
        expect(stop).toThrow();
      });
    });
  });
});
