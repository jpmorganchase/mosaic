import PullDocs from '../PullDocs';
import SourceManager from '../SourceManager';
import type SourceDefinition from '@pull-docs/types/dist/SourceDefinition';

jest.mock('../SourceManager');

describe('GIVEN PullDocs', () => {
  test('THEN it should instantiate correctly', () => {
    expect(new PullDocs({ sources: [], plugins: [] })).toBeDefined();
  });

  test('THEN it should have an addSource method', () => {
    expect(new PullDocs({ sources: [], plugins: [] })).toHaveProperty('addSource');
  });

  test('THEN it should have an onSourceUpdate method', () => {
    expect(new PullDocs({ sources: [], plugins: [] })).toHaveProperty('onSourceUpdate');
  });

  describe('WITH plugins specified', () => {
    let pullDocs;

    beforeEach(() => {
      pullDocs = new PullDocs({
        sources: [{modulePath: 'source', name: 'name'}],
        plugins: [{ modulePath: 'plugin', filter: /[a-z]$/ }]
      });
      pullDocs.addSource('name', {});
    });

    test('THEN the SourceManager should be passed the plugins', () => {
      expect(SourceManager).toHaveBeenCalledWith(
        [{ modulePath: 'plugin', filter: /[a-z]$/ }]
      );
    });
  });

  describe('WITH sources specified', () => {
    let pullDocs: PullDocs;

    const source1 = { name: 'source', modulePath: 'source-module' };
    const source2 = { name: 'source2', modulePath: 'source2-module' };

    beforeEach(() => {
      pullDocs = new PullDocs({
        sources: [source1, source2],
        plugins: []
      });
    });

    describe('AND a source changes', () => {
      test('THEN onSourceUpdate should be called', () => {
        const onSourceUpdateSpy = jest.fn();
        pullDocs.onSourceUpdate(onSourceUpdateSpy);

        const onSourceUpdateCallback = (
          SourceManager.prototype.onSourceUpdate as jest.MockedFunction<any>
        ).mock.calls[0][0];
        onSourceUpdateCallback();
        expect(onSourceUpdateSpy).toHaveBeenCalled();
      });
    });

    describe('AND adding a new source', () => {
      beforeEach(() => {
        (SourceManager.prototype.addSource as jest.MockedFunction<any>).mockClear();
      });
      test('THEN an error should throw if the source does not exist', () => {
        expect(() => pullDocs.addSource('does-not-exist', {})).rejects.toThrow(
          new Error(`Source definition 'does-not-exist' could not be found.`)
        );
      });

      test('THEN the sources should be registered with a manager', () => {
        pullDocs.addSource('source', {});
        pullDocs.addSource('source2', {});

        expect(SourceManager.prototype.addSource).toHaveBeenCalledTimes(2);
        expect(SourceManager.prototype.addSource).toHaveBeenCalledWith(
          { modulePath: 'source-module', name: 'source' },
          {}
        );
        expect(SourceManager.prototype.addSource).toHaveBeenCalledWith(
          { modulePath: 'source2-module', name: 'source2' },
          {}
        );
      });
    });
  });
});
