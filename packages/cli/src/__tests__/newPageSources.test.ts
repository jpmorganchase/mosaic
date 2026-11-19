import Fastify from 'fastify';
import { expect, test, vi } from 'vitest';
import fastifyMosaic from '../plugins/mosaicFastifyPlugin';

test('serves scoped creation metadata without caching or exposing source configuration', async () => {
  const getNewPageSources = vi.fn(() => [{ prefixDir: 'docs/sdk', writable: true }]);
  const app = Fastify();
  await app.register(fastifyMosaic, {
    config: {},
    scope: ['docs'],
    mosaic: {
      filesystem: { scope: () => ({}) },
      getNewPageSources
    }
  } as never);
  try {
    const response = await app.inject('/mosaic-new-page-sources.json');
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.json()).toEqual({
      version: 1,
      sources: [{ prefixDir: 'docs/sdk', writable: true }]
    });
    expect(getNewPageSources).toHaveBeenCalledWith(['docs']);
  } finally {
    await app.close();
  }
});
