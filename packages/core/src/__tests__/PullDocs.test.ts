import PullDocs from '../PullDocs';
import SourceManager from '../SourceManager';
import UnionVolume from '../filesystems/UnionVolume';
import MutableVolume from '../filesystems/MutableVolume';

jest.mock('../SourceManager');

describe('GIVEN PullDocs', () => {
  test('THEN it should instantiate correctly', () => {
    expect(new PullDocs({ sources: [], plugins: [] })).toBeDefined();
  });

  test('THEN it should have an onSourceUpdate method', () => {
    expect(new PullDocs({ sources: [], plugins: [] })).toHaveProperty('onSourceUpdate');
  });

  describe('WITH plugins specified', () => {
    let pullDocs;

    beforeEach(() => {
      SourceManager.mockReset();
      pullDocs = new PullDocs({
        sources: [{ modulePath: 'source', name: 'name' }],
        plugins: [{ modulePath: 'plugin', filter: /[a-z]$/ }]
      });
    });

    test('THEN the SourceManager should be passed the plugins', () => {
      expect(SourceManager).toHaveBeenCalledWith(
        expect.any(UnionVolume),
        expect.any(MutableVolume),
        [
          {
            modulePath: expect.stringMatching(/\/packages\/plugins\/dist\/\$CodeModPlugin.js/),
            options: {},
            priority: Infinity
          },
          {
            filter: /[a-z]$/,
            modulePath: 'plugin'
          },
          {
            modulePath: expect.stringMatching(/\/packages\/plugins\/dist\/\$TagPlugin.js/),
            options: {}
          },
          {
            modulePath: expect.stringMatching(/\/packages\/plugins\/dist\/\$AliasPlugin.js/),
            options: {},
            priority: -1
          },
          {
            modulePath: expect.stringMatching(/\/packages\/plugins\/dist\/\$RefPlugin.js/),
            options: {},
            priority: -1
          }
        ],
        [
          {
            filter: /\.json$/,
            modulePath: expect.stringMatching(/\/packages\/serialisers\/dist\/json.js/),
            options: {}
          }
        ],
        ['.mdx'],
        []
      );
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
    });
  });
});
