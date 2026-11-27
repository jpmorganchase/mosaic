import { createRequire } from 'node:module';
import type { NextConfig } from 'next';
import { afterEach, describe, expect, test, vi } from 'vitest';

const require = createRequire(import.meta.url);
const configPath = require.resolve('../../../next.config.js');
const { matchHas } = require('next/dist/shared/lib/router/utils/prepare-destination');
const { getPathMatch } = require('next/dist/shared/lib/router/utils/path-match');

function loadConfig(mode = 'active', output = ''): NextConfig {
  vi.stubEnv('MOSAIC_OUTPUT', output);
  vi.stubEnv('MOSAIC_MODE', mode);
  delete require.cache[configPath];
  return require(configPath)('phase-production-server');
}

async function acceptRewrite(config: NextConfig) {
  const rewrites = await config.rewrites?.();
  if (Array.isArray(rewrites)) return undefined;
  return rewrites?.beforeFiles?.find(candidate =>
    candidate.has?.some(rule => rule.type === 'header')
  );
}

afterEach(() => {
  delete require.cache[configPath];
  vi.unstubAllEnvs();
});

describe('Markdown negotiation', () => {
  test.each([
    ['text/markdown', true],
    ['text/html, TEXT/MARKDOWN; q=0.5', true],
    ['text/markdown; charset=utf-8, text/html', true],
    ['text/markdown; other=";q=0, text/html"', true],
    ['text/markdown;q=0, text/markdown;charset=utf-8;q=1', true],
    ['text/html, text/markdown;q=0', false],
    ['text/markdown; charset=utf-8; Q=0.000, text/html', false],
    ['text/markdown;charset="utf-8";q=0, text/markdown;q=1', false],
    ['text/markdown;charset=windows-1252', false],
    ['text/html; other=", text/markdown,"', false],
    ['application/x-text/markdown, text/markdown-extra', false]
  ])('matches %s as Markdown = %s', async (accept, expected) => {
    const rewrite = await acceptRewrite(loadConfig());
    expect(rewrite?.has).toBeDefined();
    expect(Boolean(matchHas({ headers: { accept } }, {}, rewrite!.has, rewrite!.missing))).toBe(
      expected
    );
  });

  test.each(['active', 'snapshot-file'])(
    'keeps both negotiated representations out of HTTP caches in %s',
    async mode => {
      const config = loadConfig(mode);
      const rewrite = await acceptRewrite(config);
      const headers = await config.headers?.();
      const noStore = headers?.find(rule =>
        rule.headers.some(header => header.key === 'Cache-Control')
      );
      expect(noStore).toEqual({
        source: rewrite?.source,
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }]
      });
      const match = getPathMatch(noStore!.source);
      expect(match('/docs/page')).toBeTruthy();
      expect(match('/docs/page.md')).toBe(false);
      expect(match('/docs/llms-full.txt')).toBe(false);
      expect(match('/api/search')).toBe(false);
      expect(match('/_next/static/chunks/app.js')).toBe(false);
      expect(match('/img/hero.png')).toBe(false);
    }
  );

  test('leaves export headers and negotiation to the static host', () => {
    const config = loadConfig('snapshot-file', 'export');
    expect(config.headers).toBeUndefined();
    expect(config.rewrites).toBeUndefined();
  });
});
