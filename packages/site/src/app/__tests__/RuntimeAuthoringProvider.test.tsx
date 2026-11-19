// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { RuntimeAuthoringProvider } from '../RuntimeAuthoringProvider';
import {
  useAuthoringSite,
  useAuthoringSitePending
} from '@jpmorganchase/mosaic-content-editor-plugin/authoringSite';

function Probe() {
  const site = useAuthoringSite();
  const pending = useAuthoringSitePending();
  return <output>{pending ? 'pending' : site?.url ?? 'local'}</output>;
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test.each(['edit', 'new'])(
  'redirects snapshot %s links after loading runtime configuration',
  async key => {
    const location = window.location;
    const replace = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...location,
        pathname: '/docs/page',
        search: `?${key}=1&tag=a&tag=b`,
        replace
      }
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ url: 'https://runtime.example.com/base' }))
    );
    try {
      render(
        <RuntimeAuthoringProvider staticExport={false}>
          <Probe />
        </RuntimeAuthoringProvider>
      );
      await waitFor(() =>
        expect(replace).toHaveBeenCalledWith(
          `https://runtime.example.com/base/docs/page?${key}=1&tag=a&tag=b`
        )
      );
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: location });
    }
  }
);

test('prerendered configuration is replaced by the runtime destination before enabling controls', async () => {
  let resolve: (value: Response) => void;
  const fetch = vi.fn(
    () =>
      new Promise<Response>(done => {
        resolve = done;
      })
  );
  vi.stubGlobal('fetch', fetch);
  render(
    <RuntimeAuthoringProvider url="https://build.example.com" staticExport={false}>
      <Probe />
    </RuntimeAuthoringProvider>
  );
  expect(screen.getByText('pending')).toBeDefined();
  resolve!(Response.json({ url: 'https://runtime.example.com/docs' }));
  await screen.findByText('https://runtime.example.com/docs');
  expect(fetch).toHaveBeenCalledWith(
    '/api/authoring',
    expect.objectContaining({ cache: 'no-store' })
  );
});

test('an unset runtime destination enables local authoring even if the build had one', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ url: null }))
  );
  render(
    <RuntimeAuthoringProvider url="https://build.example.com" staticExport={false}>
      <Probe />
    </RuntimeAuthoringProvider>
  );
  await screen.findByText('local');
});

test('static exports use the build destination without an API request', () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  render(
    <RuntimeAuthoringProvider url="https://static.example.com" staticExport>
      <Probe />
    </RuntimeAuthoringProvider>
  );
  expect(screen.getByText('https://static.example.com')).toBeDefined();
  expect(fetch).not.toHaveBeenCalled();
});

test('failed runtime configuration does not enable stale or local editor controls', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('', { status: 503 }))
  );
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  render(
    <RuntimeAuthoringProvider url="https://build.example.com" staticExport={false}>
      <Probe />
    </RuntimeAuthoringProvider>
  );
  await waitFor(() => expect(warn).toHaveBeenCalled());
  expect(screen.getByText('pending')).toBeDefined();
});
