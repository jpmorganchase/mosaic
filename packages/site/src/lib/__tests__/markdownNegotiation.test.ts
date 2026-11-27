import { createRequire } from 'node:module';
import type { NextConfig } from 'next';
import { describe, expect, test, vi } from 'vitest';

const require = createRequire(import.meta.url);
const configPath = require.resolve('../../../next.config.js');
const { matchHas } = require('next/dist/shared/lib/router/utils/prepare-destination');

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
    vi.stubEnv('MOSAIC_OUTPUT', '');
    vi.stubEnv('MOSAIC_MODE', 'active');
    delete require.cache[configPath];
    try {
      const config: NextConfig = require(configPath)('phase-production-server');
      const rewrites = await config.rewrites?.();
      const rewrite = !Array.isArray(rewrites)
        ? rewrites?.beforeFiles.find(candidate =>
            candidate.has?.some(rule => rule.type === 'header')
          )
        : undefined;
      expect(rewrite?.has).toBeDefined();
      expect(Boolean(matchHas({ headers: { accept } }, {}, rewrite!.has, rewrite!.missing))).toBe(
        expected
      );
    } finally {
      delete require.cache[configPath];
      vi.unstubAllEnvs();
    }
  });
});
