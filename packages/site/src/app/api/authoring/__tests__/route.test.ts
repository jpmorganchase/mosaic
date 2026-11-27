import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

test.each([undefined, 'https://runtime.example.com/docs/?old=1#top'])(
  'serves the deployed authoring config %s without caching',
  async value => {
    vi.resetModules();
    vi.stubEnv('MOSAIC_AUTHORING_URL', value);
    const { GET, dynamic } = await import('../route');
    const response = GET();
    expect(dynamic).toBe('force-dynamic');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({
      url: value ? 'https://runtime.example.com/docs' : null
    });
  }
);
