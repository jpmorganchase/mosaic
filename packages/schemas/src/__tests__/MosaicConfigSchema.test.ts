import { describe, expect, test, vi } from 'vitest';
import { mosaicConfigSchema } from '../MosaicConfigSchema.js';
import { validateMosaicSchema } from '../validate.js';

const config = {
  pageExtensions: ['.mdx'],
  serialisers: [],
  plugins: [],
  sources: [{ modulePath: 'source', namespace: 'docs' }]
};

describe('Mosaic configuration validation', () => {
  test('applies nested retry defaults when the schedule is omitted', () => {
    expect(mosaicConfigSchema.parse(config).schedule).toEqual({
      checkIntervalMins: 30,
      initialDelayMs: 1000,
      retryEnabled: true,
      retryDelayMins: 5,
      maxRetries: 100,
      resetOnSuccess: true
    });
  });

  test('allows unlimited retries in the source schedule', () => {
    const { schedule } = mosaicConfigSchema.parse({
      ...config,
      schedule: { checkIntervalMins: 30, initialDelayMs: 1000, maxRetries: Infinity }
    });

    expect(schedule.maxRetries).toBe(Infinity);
  });

  test('accepts infinite priorities for plugins that must run first or last', () => {
    const plugins = [
      { modulePath: 'first', priority: Infinity },
      { modulePath: 'last', priority: -Infinity }
    ];

    expect(mosaicConfigSchema.parse({ ...config, plugins }).plugins).toEqual(plugins);
  });

  test('preserves the match-all filter when a serialiser omits it', () => {
    const { serialisers } = mosaicConfigSchema.parse({
      ...config,
      serialisers: [{ modulePath: 'serialiser' }]
    });

    expect(serialisers[0].filter.test('docs/index.mdx')).toBe(true);
  });

  test('reports the missing plugin path in a non-fatal validation', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(validateMosaicSchema(mosaicConfigSchema, { ...config, plugins: [{}] }, false)).toEqual(
        {}
      );
      expect(log).toHaveBeenCalledWith(
        expect.stringContaining('A path to the plugin module is required.')
      );
    } finally {
      log.mockRestore();
    }
  });
});
