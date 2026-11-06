import { describe, expect, test, beforeEach, vi, Mock, MockedFunction } from 'vitest';
import PullDocs from '../PullDocs';
import SourceManager from '../SourceManager';
import UnionVolume from '../filesystems/UnionVolume';
import MutableVolume from '../filesystems/MutableVolume';
import { MosaicConfig } from '@jpmorganchase/mosaic-schemas';

vi.mock('../SourceManager');

vi.mock('@jpmorganchase/mosaic-schemas', async importOriginal => ({
  ...(await importOriginal()),
  validateMosaicSchema: vi.fn().mockImplementation((_schema, config) => config)
}));

const mockConfig: MosaicConfig = {
  sources: [
    {
      modulePath: 'source-module',
      namespace: 'namespace'
    }
  ],
  plugins: [],
  serialisers: [],
  pageExtensions: ['.mdx'],
  schedule: { checkIntervalMins: 1, initialDelayMs: 1000 }
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
      (SourceManager as Mock<SourceManager>).mockReset();

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
        [],
        { checkIntervalMins: 1, initialDelayMs: 1000 }
      );
    });

    describe('WITH sources specified', () => {
      let pullDocs: PullDocs;

      beforeEach(() => {
        pullDocs = new PullDocs(mockConfig);
      });

      describe('AND a source changes', () => {
        test('THEN onSourceUpdate should be called', () => {
          const onSourceUpdateSpy = vi.fn();
          pullDocs.onSourceUpdate(onSourceUpdateSpy);

          const onSourceUpdateCallback = (
            SourceManager.prototype.onSourceUpdate as MockedFunction<any>
          ).mock.calls[0][0];
          onSourceUpdateCallback();
          expect(onSourceUpdateSpy).toHaveBeenCalled();
        });
      });

      describe('AND a source is refreshed', () => {
        test('THEN the source manager refreshes it', async () => {
          (SourceManager.prototype.refreshSource as MockedFunction<any>).mockResolvedValueOnce(
            true
          );
          await expect(pullDocs.refreshSource('source#1234')).resolves.toBe(true);
          expect(SourceManager.prototype.refreshSource).toHaveBeenCalledWith('source#1234');
        });
      });

      describe('AND a source definition is requested', () => {
        test('THEN the source manager returns it', () => {
          const definition = { modulePath: 'source-module', namespace: 'namespace' };
          (SourceManager.prototype.getSourceDefinition as MockedFunction<any>).mockReturnValueOnce(
            definition
          );
          expect(pullDocs.getSourceDefinition('source#1234')).toBe(definition);
          expect(SourceManager.prototype.getSourceDefinition).toHaveBeenCalledWith('source#1234');
        });
      });
    });
  });
});
