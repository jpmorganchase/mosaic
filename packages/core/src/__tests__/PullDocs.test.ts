import PullDocs from '../PullDocs';
import SourceManager from '../SourceManager';
import UnionVolume from '../filesystems/UnionVolume';
import MutableVolume from '../filesystems/MutableVolume';
import { MosaicConfig } from '@jpmorganchase/mosaic-schemas';

jest.mock('../SourceManager');

const mockConfig: MosaicConfig = {
  sources: [
    {
      modulePath: 'source-module',
      namespace: 'namespace'
    }
  ],
  plugins: [],
  serialisers: [],
  pageExtensions: ['.mdx']
};

describe('GIVEN PullDocs', () => {
  test('THEN it should instantiate correctly', () => {
    expect(new PullDocs(mockConfig)).toBeDefined();
  });

  test('THEN it should have an onSourceUpdate method', () => {
    expect(new PullDocs(mockConfig)).toHaveProperty('onSourceUpdate');
  });

  describe('WITH plugins specified', () => {
    let pullDocs;

    beforeEach(() => {
      (SourceManager as jest.Mock<SourceManager>).mockReset();

      pullDocs = new PullDocs({
        ...mockConfig,
        plugins: [
          { modulePath: 'plugin', filter: /[a-z]$/ },
          {
            modulePath: 'unique_plugin',
            options: { one: 'ALWAYS_PRESENT', two: 'WILL_BE_REPLACED' }
          },
          {
            modulePath: 'unique_plugin',
            options: { two: 'HAS_BEEN_REPLACED', three: 'HAS_BEEN_ADDED' }
          },
          {
            modulePath: 'disabled_plugin',
            disabled: true
          }
        ]
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
            modulePath: 'unique_plugin',
            options: { one: 'ALWAYS_PRESENT', two: 'HAS_BEEN_REPLACED', three: 'HAS_BEEN_ADDED' }
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
            modulePath: expect.stringMatching(/\/packages\/serialisers\/dist\/json.js/)
          }
        ],
        ['.mdx'],
        []
      );
    });

    describe('WITH sources specified', () => {
      let pullDocs: PullDocs;

      beforeEach(() => {
        pullDocs = new PullDocs(mockConfig);
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
