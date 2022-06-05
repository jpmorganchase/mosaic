import debounce from 'lodash/debounce';

import Source from '../Source';
import SourceManager from '../SourceManager';

jest.mock('lodash/debounce');
jest.mock('../Source');

jest.mock('../worker/helpers/plugins', () => async (plugins, _fs) => {
  return async (_, input) => input;
});

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
  const onStartCallbackCalls = (Source.prototype.onStart as jest.MockedFunction<any>).mock.calls;
  return onStartCallbackCalls[onStartCallbackCalls.length - 1][0];
}

function getLastUpdateCallback() {
  const onUpdateCallbackCalls = (Source.prototype.onUpdate as jest.MockedFunction<any>).mock.calls;
  return onUpdateCallbackCalls[onUpdateCallbackCalls.length - 1][0];
}

describe('GIVEN SourceManager', () => {
  beforeEach(() => {
    (debounce as jest.MockedFunction<any>).mockImplementation(
      callback =>
        (...args) =>
          setTimeout(() => callback(...args))
    );
  });
  test('THEN it should instantiate correctly', () => {
    expect(new SourceManager([])).toBeDefined();
  });

  test('THEN it should have an addSource method', () => {
    expect(new SourceManager([])).toHaveProperty('addSource');
  });

  test('THEN it should have an getSource method', () => {
    expect(new SourceManager([])).toHaveProperty('getSource');
  });

  test('THEN it should have an destroyAll method', () => {
    expect(new SourceManager([])).toHaveProperty('destroyAll');
  });

  describe('WHEN destroying a source', () => {
    let sourceManager: SourceManager;

    beforeEach(() => {
      jest.spyOn(Source.prototype, 'onExit').mockReturnValue(jest.fn());
      jest.spyOn(Source.prototype, 'onError').mockReturnValue(jest.fn());
      jest.spyOn(Source.prototype, 'onUpdate').mockReturnValue(jest.fn());
      jest.spyOn(Source.prototype, 'onStart').mockReturnValue(jest.fn());
      jest.spyOn(Source.prototype, 'stop').mockClear();

      sourceManager = new SourceManager([]);
    });

    afterEach(() => {
      (Source.prototype.stop as jest.MockedFunction<any>).mockReset();
      (Source.prototype.onStart as jest.MockedFunction<any>).mockReset();
    });

    test('THEN calling `destroyAll` should stop all sources', async () => {
      (Source.prototype as jest.MockedFunction<any>).id = '1';
      scheduleOnStartCallback();
      await sourceManager.addSource({ modulePath: '1', name: '1' }, {});
      (Source.prototype as jest.MockedFunction<any>).id = '2';
      scheduleOnStartCallback();
      await sourceManager.addSource({ modulePath: '2', name: '2' }, {});
      (Source.prototype as jest.MockedFunction<any>).id = '3';
      scheduleOnStartCallback();
      await sourceManager.addSource({ modulePath: '3', name: '3' }, {});
      sourceManager.destroyAll();
      expect(Source.prototype.stop).toHaveBeenCalledTimes(3);
    });

    test('THEN the cleanup callback should call `stop` on the Source ', async () => {
      let removeSourceCallback;
      scheduleOnStartCallback();
      await sourceManager.addSource({ modulePath: '1', name: '2' }, {}).then(removeSource => {
        removeSourceCallback = removeSource;
      });
      expect(Source.prototype.onStart).toHaveBeenCalled();
      const onStartCallback = getOnStartCallback();
      expect(onStartCallback).toBeDefined();
      onStartCallback();
      await new Promise(resolve => setTimeout(resolve));
      expect(removeSourceCallback).toBeDefined();
      removeSourceCallback();
      expect(Source.prototype.stop).toHaveBeenCalled();
    });
  });

  describe('WHEN adding a source with plugins', () => {
    let sourceManager: SourceManager;
    beforeEach(async () => {
      sourceManager = new SourceManager(
        [{ options: { plugins: true } }]
      );
      scheduleOnStartCallback();
      await sourceManager.addSource({ name: 'source', modulePath: 'source-module' }, {});
    });
    test('THEN the plugins should be used', () => {
      expect(Source.prototype.use).toHaveBeenCalledWith(
        [{ options: { plugins: true } }]
      );
    });
    test('THEN the sources should be created for the new sources', async () => {
      scheduleOnStartCallback();
      await sourceManager.addSource(
        { name: 'source', modulePath: 'source-module', options: { a: true } },
        {}
      );

      expect(Source).toHaveBeenCalledWith({
        name: 'source',
        modulePath: 'source-module',
        options: { a: true }
      });
    });
  });

  describe('WHEN adding a source', () => {
    let sourceManager: SourceManager;

    afterEach(() => {

    });
    beforeEach(() => {
      (Source.prototype as jest.MockedFunction<any>).id = 'symbol';
      (Source.prototype as jest.MockedFunction<any>).filesystem = 'fs';
      sourceManager = new SourceManager([]);
      jest.spyOn(Source.prototype, 'onExit').mockReturnValue(jest.fn());
      jest.spyOn(Source.prototype, 'onError').mockReturnValue(jest.fn());
      jest.spyOn(Source.prototype, 'onUpdate').mockReturnValue(jest.fn());
      jest.spyOn(Source.prototype, 'onStart').mockReturnValue(jest.fn());
      jest.spyOn(Source.prototype, 'stop').mockClear();
    });
    describe('AND the source changes', () => {
      describe("AND the source hasn't initialised yet", () => {
        test('THEN `onSourceUpdate` should not be called and an error should be thrown', async () => {
          const onSourceUpdateSpy = jest.fn();
          sourceManager.onSourceUpdate(onSourceUpdateSpy);
          const sourceCreatorPromise = sourceManager.addSource(
            { name: 'source', modulePath: 'source-module' },
            {}
          );
          const onUpdateCallbackCalls = (Source.prototype.onUpdate as jest.MockedFunction<any>).mock
            .calls;
          const latestOnUpdateCallback = onUpdateCallbackCalls[onUpdateCallbackCalls.length - 1][0];
          expect(latestOnUpdateCallback).toBeDefined();
          latestOnUpdateCallback('message');

          expect(() => sourceCreatorPromise).rejects.toThrow('message');
        });
      });

      test('THEN `onSourceUpdate` should be called', async () => {
        const onSourceUpdateSpy = jest.fn();
        sourceManager.onSourceUpdate(onSourceUpdateSpy);

        scheduleOnUpdateCallback('message');

        await expect(() =>
          sourceManager.addSource({ name: 'source2', modulePath: 'source2-module' }, {})
        ).rejects.toThrow(
          new Error("Source 'source2' received a message before it was initialised.")
        );
      });

      test('THEN `onSourceUpdate` should be called with a filesystem', async () => {
        const onSourceUpdateSpy = jest.fn();
        sourceManager.onSourceUpdate(onSourceUpdateSpy);
        scheduleOnStartCallback();
        await sourceManager.addSource({ name: 'source', modulePath: 'source-module' }, {});

        const latestOnUpdateCallback = getLastUpdateCallback();
        expect(latestOnUpdateCallback).toBeDefined();
        latestOnUpdateCallback(['message1', 'message1.2']);

        scheduleOnStartCallback();
        await sourceManager.addSource({ name: 'source', modulePath: 'source-module' }, {});

        await new Promise(resolve => setTimeout(resolve));
        expect(onSourceUpdateSpy).toHaveBeenCalledWith(
          'fs',
          expect.any(Source)
        );
      });
    });

    test('THEN the source should be available via `getSource`', async () => {
      scheduleOnStartCallback();
      await sourceManager.addSource({ name: 'source', modulePath: 'source-module' }, {});
      scheduleOnStartCallback();
      await sourceManager.addSource({ name: 'source2', modulePath: 'source2-module' }, {});
      expect(sourceManager.getSource('symbol' as unknown as Symbol)).toEqual(expect.any(Source));
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

      expect(Source).toHaveBeenCalledWith({
        name: 'source',
        modulePath: 'source-module',
        options: { a: true }
      });
      expect(Source).toHaveBeenCalledWith({
        name: 'source2',
        modulePath: 'source2-module',
        options: { b: true }
      });
    });

    describe('AND an error is thrown or an early exit occurs', () => {
      beforeEach(() => {
        jest.spyOn(Source.prototype, 'onError').mockImplementation(() => jest.fn());
      });
      test('THEN an error should be reported for any early exit, as a rejected promise', async () => {
        setTimeout(() => {
          const onExitCallbackCalls = (Source.prototype.onExit as jest.MockedFunction<any>).mock
            .calls;
          const latestOnExitCallback = onExitCallbackCalls[onExitCallbackCalls.length - 1][0];
          latestOnExitCallback();
        });
        await expect(() =>
          sourceManager.addSource({ name: 'source', modulePath: 'source-module' }, {})
        ).rejects.toThrow(new Error("Source 'source' silently exited before initialising."));
      });
      test('THEN the error should be reported in a rejected promise', async () => {
        setTimeout(() => {
          const onErrorCallbackCalls = (Source.prototype.onError as jest.MockedFunction<any>).mock
            .calls;
          const latestOnErrorCallback = onErrorCallbackCalls[onErrorCallbackCalls.length - 1][0];
          latestOnErrorCallback(new Error('some error'));
        });
        await expect(() =>
          sourceManager.addSource({ name: 'source', modulePath: 'source-module' }, {})
        ).rejects.toThrow(new Error('some error'));
      });
    });

    test('THEN it should call `start` on the Source', async () => {
      jest.spyOn(Source.prototype, 'start');
      scheduleOnStartCallback();
      await sourceManager.addSource({ name: 'source', modulePath: 'source-module' }, {});
      expect(Source.prototype.start).toHaveBeenCalled();
    });
  });
});
