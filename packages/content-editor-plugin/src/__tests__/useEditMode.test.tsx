/**
 * Unit tests for `useEditMode`.
 *
 * Specifically the two-mode-aware `stopEditing` branch added
 * alongside the new-page flow: a create-mode URL
 * (`?new=1&title=...`) needs to be navigated to the parent
 * folder (the synthesised route doesn't exist on disk) AND
 * stripped of all create flags, whereas an edit-mode URL
 * (`?edit=1`) just drops the one flag and stays on `pathname`.
 *
 * `next/navigation` is mocked at module level — we don't need
 * Next's actual router for any of this; the assertions are all
 * "what URL did we tell the router to replace to?".
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const replace = vi.fn();
const searchParamsState = { search: '' };
const pathnameState = { value: '/docs/foo/bar' };

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => pathnameState.value,
  useSearchParams: () => new URLSearchParams(searchParamsState.search)
}));

import { useEditMode } from '../useEditMode';

/** Convenience: set the current "URL" the hooks observe. */
function setUrl(pathname: string, search = '') {
  pathnameState.value = pathname;
  searchParamsState.search = search;
  // The hook reads `window.location.search` on demand inside the
  // writers (so a `router.replace(...)` from one writer is visible
  // to the next call without a re-render), so we mirror the same
  // value on the jsdom window object.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, search: search ? `?${search.replace(/^\?/, '')}` : '' }
  });
}

beforeEach(() => {
  replace.mockReset();
});

afterEach(() => {
  // Reset state in case a sibling test relies on defaults.
  setUrl('/docs/foo/bar', '');
});

describe('useEditMode.stopEditing', () => {
  it('strips ?edit=1 and stays on the current path in edit mode', () => {
    setUrl('/docs/foo/bar', 'edit=1');

    const { result } = renderHook(() => useEditMode());
    act(() => result.current.stopEditing());

    expect(replace).toHaveBeenCalledWith('/docs/foo/bar', { scroll: false });
  });

  it('preserves unrelated query params when stripping ?edit=1', () => {
    setUrl('/docs/foo/bar', 'edit=1&hl=python');

    const { result } = renderHook(() => useEditMode());
    act(() => result.current.stopEditing());

    expect(replace).toHaveBeenCalledWith('/docs/foo/bar?hl=python', { scroll: false });
  });

  it('navigates to the parent folder in create mode (route doesn\u2019t exist on disk)', () => {
    // `?new=1&title=...` means the editor synthesised a page
    // for a route that doesn't exist yet. Cancelling has to
    // navigate AWAY — staying on the route would 404 the next
    // page render once the editor unmounts.
    setUrl('/docs/foo/new-page', 'new=1&title=My%20New%20Page');

    const { result } = renderHook(() => useEditMode());
    act(() => result.current.stopEditing());

    expect(replace).toHaveBeenCalledWith('/docs/foo', { scroll: false });
  });

  it('strips new+title+existed flags together (create-mode cancel)', () => {
    setUrl('/docs/foo/new-page', 'new=1&title=X&existed=1&hl=python');

    const { result } = renderHook(() => useEditMode());
    act(() => result.current.stopEditing());

    // Result is the parent folder with only the non-create
    // params preserved. `existed=1` is a server-side marker
    // tied to a create-then-collision flow — it's stale once
    // the user cancels, so we drop it too.
    expect(replace).toHaveBeenCalledWith('/docs/foo?hl=python', { scroll: false });
  });

  it('falls back to root when the create-mode page is top-level', () => {
    // Parent of `/foo` would be empty; the implementation
    // coerces that to `/` so we never navigate to `''`.
    setUrl('/orphan', 'new=1&title=X');

    const { result } = renderHook(() => useEditMode());
    act(() => result.current.stopEditing());

    expect(replace).toHaveBeenCalledWith('/', { scroll: false });
  });
});
