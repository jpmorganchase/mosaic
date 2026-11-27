// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { CanonicalizeUrl, LiveReload } from '../client.js';

const { refresh, usePathname } = vi.hoisted(() => ({
  refresh: vi.fn(),
  usePathname: vi.fn()
}));
const router = { refresh };
vi.mock('next/navigation', () => ({ usePathname, useRouter: () => router }));
afterEach(() => {
  cleanup();
  usePathname.mockReset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test.each([
  ['/docs', '/docs', '/docs/index', '/docs/index'],
  ['/portal/docs', '/docs', '/docs/index', '/portal/docs/index'],
  ['/portal/guides/docs/', '/docs', '/docs/index', '/portal/guides/docs/index'],
  ['/portal', '/', '/index', '/portal/index']
])(
  'canonicalizes %s and keeps router state, query and hash',
  (browserPath, appPath, target, expected) => {
    const state = { __NA: true, tree: ['router'] };
    usePathname.mockReturnValue(appPath);
    window.history.replaceState(state, '', `${browserPath}?edit=1#heading`);
    render(<CanonicalizeUrl canonical={target} />);
    expect(window.location.pathname + window.location.search + window.location.hash).toBe(
      `${expected}?edit=1#heading`
    );
    expect(window.history.state).toEqual(state);
  }
);

test('leaves the browser URL alone when it no longer matches the route', () => {
  usePathname.mockReturnValue('/docs');
  window.history.replaceState(null, '', '/portal/other');
  render(<CanonicalizeUrl canonical="/docs/index" />);
  expect(window.location.pathname).toBe('/portal/other');
});

test('uses a custom endpoint, notifies once per event and disconnects on unmount', () => {
  class Source extends EventTarget {
    static instance: Source;
    close = vi.fn();
    constructor(public url: string) {
      super();
      Source.instance = this;
    }
  }
  vi.stubGlobal('EventSource', Source);
  const callback = vi.fn();
  const { unmount, rerender } = render(
    <LiveReload endpoint="/custom/live" onContentChanged={callback} />
  );
  const first = Source.instance;
  expect(first.url).toBe('/custom/live');
  act(() => first.dispatchEvent(new Event('content-changed')));
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenCalledTimes(1);
  rerender(<LiveReload endpoint="/second/live" onContentChanged={callback} />);
  expect(first.close).toHaveBeenCalledOnce();
  act(() => first.dispatchEvent(new Event('content-changed')));
  expect(callback).toHaveBeenCalledTimes(1);
  unmount();
  expect(Source.instance.close).toHaveBeenCalledOnce();
  act(() => Source.instance.dispatchEvent(new Event('content-changed')));
  expect(callback).toHaveBeenCalledTimes(1);
});
