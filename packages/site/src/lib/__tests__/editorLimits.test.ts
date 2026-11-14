import { createRequire } from 'node:module';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { MAX_FRONTMATTER_BYTES, MAX_MARKDOWN_BYTES } from '../editorLimits';

const require = createRequire(import.meta.url);
const configPath = require.resolve('../../../next.config.js');
const bytes = require('next/dist/compiled/bytes') as { parse(value: string | number): number };

function loadConfig(output?: string) {
  if (output) vi.stubEnv('MOSAIC_OUTPUT', output);
  delete require.cache[configPath];
  const config = require(configPath)('phase-production-server');
  return config.experimental?.serverActions?.bodySizeLimit as string | number | undefined;
}

afterEach(() => {
  vi.unstubAllEnvs();
  delete require.cache[configPath];
});

describe('GIVEN the Server Action body size limit', () => {
  // JSON escaping can double a string on the wire.
  const largestSave = 2 * (MAX_MARKDOWN_BYTES + MAX_FRONTMATTER_BYTES);

  test.each([
    ['default', undefined],
    ['standalone', 'standalone']
  ])('THEN the %s server build accepts the largest save the editor allows', (_name, output) => {
    const limit = loadConfig(output);
    expect(limit).toBeDefined();
    expect(bytes.parse(limit!)).toBeGreaterThanOrEqual(largestSave);
  });
});
