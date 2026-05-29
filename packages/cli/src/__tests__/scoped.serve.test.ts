import { describe, expect, test, beforeAll, afterAll, vi } from 'vitest';
import type { MosaicConfig } from '@jpmorganchase/mosaic-types';
import serve, { server } from '../serve';

const mosaicConfig: MosaicConfig = {
  enableSourcePush: true,
  schedule: {
    checkIntervalMins: 60,
    initialDelayMs: 1000,
    retryDelayMins: 15,
    maxRetries: 20,
    retryEnabled: true,
    resetOnSuccess: true
  },
  pageExtensions: ['.mdx', '.json'],
  ignorePages: ['shared-config.json', 'sitemap.xml', 'sidebar.json'],
  serialisers: [],
  plugins: [],
  sources: [
    {
      modulePath: '@jpmorganchase/mosaic-source-local-folder',
      namespace: 'mosaic',
      options: {
        rootDir: '../../docs',
        prefixDir: 'mosaic',
        extensions: ['.mdx']
      }
    },
    {
      modulePath: '@jpmorganchase/mosaic-source-git-repo',
      namespace: 'mosaic',
      options: {
        credentials: 'david: Password1',
        prefixDir: 'mosaic/docs',
        subfolder: 'docs',
        repo: 'https://repo-url',
        branch: 'develop',
        extensions: ['.mdx'],
        remote: 'origin'
      }
    }
  ]
};

const mockScopeFn = vi.fn();

const mockFileSystem = {
  scope: mockScopeFn
};

vi.mock('@jpmorganchase/mosaic-core', () => ({
  // Use a `function` (not an arrow) so the mock can be invoked with
  // `new` — Vitest 4 routes constructor calls through `Reflect.construct`,
  // which requires the implementation to be a constructable function.
  default: vi.fn().mockImplementation(function MosaicCoreMock() {
    return {
      start: vi.fn(),
      filesystem: mockFileSystem
    };
  })
}));

describe('GIVEN the serve command with a scope', () => {
  beforeAll(async () => {
    await serve(mosaicConfig, 0, ['docs'] /** scope */);
  });

  afterAll(async () => {
    await server.close();
  });

  test('THEN a scoped filesystem is used', async () => {
    expect(mockScopeFn).toBeCalledTimes(1);
    expect(mockScopeFn.mock.calls[0][0]).toEqual(['docs']);
  });
});
