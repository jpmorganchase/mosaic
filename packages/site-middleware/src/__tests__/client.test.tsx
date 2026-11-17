// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { CanonicalizeUrl, LiveReload } from '../client.js';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
const router = { refresh };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('canonicalizes only when mounted, preserving router state, query and hash', () => {
  const state = { __NA: true, tree: ['router'] };
  window.history.replaceState(state, '', '/docs?edit=1#heading');
  render(<CanonicalizeUrl canonical="/docs/index" />);
  expect(window.location.pathname + window.location.search + window.location.hash).toBe(
    '/docs/index?edit=1#heading'
  );
  expect(window.history.state).toEqual(state);
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
