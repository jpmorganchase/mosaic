import PullDocs from '../PullDocs';
import UnionVolume from '../filesystems/UnionVolume';
import MutableVolume from '../filesystems/MutableVolume';
import { MosaicConfig } from '@jpmorganchase/mosaic-schemas';

const sourceManagerConstructorMock = jest.fn();
const addSourceMock = jest.fn();
const onSourceUpdateMock = jest.fn();
jest.mock('../SourceManager', () => {
  return class MockedSourceManager {
    constructor(...args) {
      sourceManagerConstructorMock(...args);
    }
    async addSource(...args) {
      addSourceMock(...args);
    }
    onSourceUpdate(...args) {
      onSourceUpdateMock(...args);
    }
  };
});

const mockConfig: MosaicConfig = {
  sources: [
    {
      modulePath: 'source-module',
      namespace: 'namespace'
    },
    {
      disabled: true,
      modulePath: 'disabled-source-module',
      namespace: 'namespace'
    }
  ],
  plugins: [],
  serialisers: [],
  pageExtensions: ['.mdx']
};

describe('GIVEN PullDocs', () => {
  beforeEach(() => {
    sourceManagerConstructorMock.mockReset();
    addSourceMock.mockReset();
    onSourceUpdateMock.mockReset();
  });

  test('THEN it should instantiate correctly', () => {
    expect(new PullDocs(mockConfig)).toBeDefined();
  });

  test('THEN it should have an onSourceUpdate method', () => {
    expect(new PullDocs(mockConfig)).toHaveProperty('onSourceUpdate');
  });

  describe('WITH plugins specified', () => {
    let pullDocs;

    beforeEach(() => {
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
      expect(sourceManagerConstructorMock).toHaveBeenCalledWith(
        expect.any(UnionVolume),
        expect.any(MutableVolume),
        [
          {
            modulePath: expect.stringMatching(
              /[\/\\]packages[\/\\]plugins[\/\\]dist[\/\\]\$CodeModPlugin.js/
            ),
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
            modulePath: expect.stringMatching(
              /[\/\\]packages[\/\\]plugins[\/\\]dist[\/\\]\$TagPlugin.js/
            ),
            options: {}
          },
          {
            modulePath: expect.stringMatching(
              /[\/\\]packages[\/\\]plugins[\/\\]dist[\/\\]\$AliasPlugin.js/
            ),
            options: {},
            priority: -1
          },
          {
            modulePath: expect.stringMatching(
              /[\/\\]packages[\/\\]plugins[\/\\]dist[\/\\]\$RefPlugin.js/
            ),
            options: {},
            priority: -1
          }
        ],
        [
          {
            filter: /\.json$/,
            modulePath: expect.stringMatching(
              /[\/\\]packages[\/\\]serialisers[\/\\]dist[\/\\]json.js/
            )
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
        pullDocs.start();
      });

      test('THEN only enabled sources are added', () => {
        expect(addSourceMock).toHaveBeenCalledTimes(1);
        expect(addSourceMock).toHaveBeenCalledWith(
          { modulePath: 'source-module', namespace: 'namespace' },
          {}
        );
      });

      describe('AND a source changes', () => {
        test('THEN onSourceUpdate should be called', () => {
          const updateMock = jest.fn();
          pullDocs.onSourceUpdate(updateMock);
          expect(onSourceUpdateMock).toHaveBeenCalledWith(updateMock);
        });
      });
    });
  });
});
