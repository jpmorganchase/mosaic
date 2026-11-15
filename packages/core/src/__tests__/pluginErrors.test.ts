import { describe, expect, test, vi } from 'vitest';
import pluginRunner from '../plugin/pluginRunner.js';

describe('plugin error diagnostics', () => {
  test.each([new Error('Markdown conversion failed'), 'conversion failed', null])(
    'preserves JSON-serializable diagnostics and continues the pipeline for %s',
    async exception => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const next = vi.fn(pages => pages);
        const pages = [{ fullPath: '/salt/index.mdx' }];
        const { errors, result } = await pluginRunner(
          {
            lifecycleName: '$afterSource',
            loadedPlugins: [
              {
                modulePath: '/plugins/MarkdownConverter.js',
                $afterSource: async () => {
                  throw exception;
                }
              },
              { modulePath: '/plugins/Next.js', $afterSource: next }
            ]
          },
          pages
        );
        expect(JSON.parse(JSON.stringify(errors))).toEqual([
          expect.objectContaining({
            pluginName: 'MarkdownConverter',
            lifecycleMethod: '$afterSource',
            message: exception instanceof Error ? exception.message : String(exception)
          })
        ]);
        if (exception instanceof Error) expect(errors[0].stack).toBe(exception.stack);
        expect(next).toHaveBeenCalled();
        expect(result).toBe(pages);
      } finally {
        log.mockRestore();
      }
    }
  );
});
