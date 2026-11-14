import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { EditorProvider, useSaveState } from '../../EditorContext';
import { LeaveGuardPlugin } from '../../plugins/LeaveGuardPlugin';
import { confirmLeave } from '../../leaveGuard';

function StateControls() {
  const { markDirty, markSaving, markSaved, markSaveFailed } = useSaveState();
  return (
    <>
      <button onClick={markDirty}>Edit</button>
      <button onClick={markSaving}>Saving</button>
      <button onClick={markSaved}>Saved</button>
      <button onClick={markSaveFailed}>Failed</button>
    </>
  );
}

beforeEach(() => {
  window.history.replaceState(null, '', '/docs/page?edit=1');
});
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, 'navigation');
  window.history.replaceState(null, '', '/');
});

function mountGuard() {
  return render(
    <EditorProvider>
      <StateControls />
      <LeaveGuardPlugin />
    </EditorProvider>
  );
}

function unloadIsPrevented() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

test('guards dirty and pending saves, releases completed saves, and guards subsequent edits', () => {
  mountGuard();
  expect(unloadIsPrevented()).toBe(false);
  fireEvent.click(screen.getByText('Edit'));
  expect(unloadIsPrevented()).toBe(true);
  fireEvent.click(screen.getByText('Saving'));
  expect(unloadIsPrevented()).toBe(true);
  fireEvent.click(screen.getByText('Saved'));
  expect(unloadIsPrevented()).toBe(false);
  act(() => window.history.pushState(null, '', '/docs/after-save'));
  expect(window.location.pathname).toBe('/docs/after-save');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Edit'));
  expect(unloadIsPrevented()).toBe(true);
  fireEvent.click(screen.getByText('Saving'));
  fireEvent.click(screen.getByText('Failed'));
  expect(unloadIsPrevented()).toBe(true);
});

test.each(['edit', 'new'])('allows %s mode switches but guards leaving the editor', flag => {
  window.history.replaceState(null, '', `/docs/page?${flag}=1&mode=frontmatter`);
  mountGuard();
  fireEvent.click(screen.getByText('Edit'));
  act(() => window.history.replaceState(null, '', `/docs/page?${flag}=1&mode=source`));
  expect(window.location.search).toContain('mode=source');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  act(() => window.history.pushState(null, '', `/docs/page?${flag}=1&filter=changed`));
  expect(screen.getByRole('dialog')).toBeVisible();
  expect(window.location.search).toContain('mode=source');
  fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
  act(() => window.history.pushState(null, '', `/docs/another?${flag}=1&mode=source`));
  expect(screen.getByRole('dialog')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
  act(() => window.history.replaceState(null, '', '/docs/page'));
  expect(screen.getByRole('dialog')).toBeVisible();
});

test('retains leave protection for edits made after a save started', () => {
  mountGuard();
  fireEvent.click(screen.getByText('Edit'));
  fireEvent.click(screen.getByText('Saving'));
  fireEvent.click(screen.getByText('Edit'));
  fireEvent.click(screen.getByText('Saved'));
  expect(unloadIsPrevented()).toBe(true);
  fireEvent.click(screen.getByText('Saving'));
  fireEvent.click(screen.getByText('Saved'));
  expect(unloadIsPrevented()).toBe(false);
});

function mockTraversalNavigation() {
  const navigation = Object.assign(new EventTarget(), {
    traverseTo: vi.fn((_key: string) => ({ finished: Promise.resolve() }))
  });
  Object.defineProperty(window, 'navigation', { configurable: true, value: navigation });
  const traverse = (url = 'http://localhost/docs/previous', cancelable = true) => {
    const event = Object.assign(new Event('navigate', { cancelable }), {
      navigationType: 'traverse',
      destination: { key: 'previous-entry', url, sameDocument: true }
    });
    act(() => navigation.dispatchEvent(event));
    return event;
  };
  return { navigation, traverse };
}

test.each(['Edit', 'Saving'])(
  'confirms browser traversal during %s and replays only on discard',
  state => {
    const { navigation, traverse } = mockTraversalNavigation();
    mountGuard();
    fireEvent.click(screen.getByText(state));
    expect(traverse().defaultPrevented).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(navigation.traverseTo).not.toHaveBeenCalled();
    expect(traverse().defaultPrevented).toBe(true);
    navigation.traverseTo.mockImplementationOnce(() => {
      expect(traverse().defaultPrevented).toBe(false);
      return { finished: Promise.resolve() };
    });
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(navigation.traverseTo).toHaveBeenCalledExactlyOnceWith('previous-entry');
  }
);

test('lets saved drafts, intra-editor modes and non-cancelable browser traversals through', () => {
  const { traverse } = mockTraversalNavigation();
  mountGuard();
  expect(traverse().defaultPrevented).toBe(false);
  fireEvent.click(screen.getByText('Edit'));
  expect(traverse('http://localhost/docs/page?edit=1&mode=source').defaultPrevented).toBe(false);
  expect(traverse(undefined, false).defaultPrevented).toBe(false);
  fireEvent.click(screen.getByText('Saving'));
  fireEvent.click(screen.getByText('Saved'));
  expect(traverse().defaultPrevented).toBe(false);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('removes the native traversal listener when the editor unmounts', () => {
  const { traverse } = mockTraversalNavigation();
  const view = mountGuard();
  fireEvent.click(screen.getByText('Edit'));
  expect(traverse().defaultPrevented).toBe(true);
  view.unmount();
  expect(traverse().defaultPrevented).toBe(false);
});

test('asks before Cancel or Stop Editing discards unsaved changes', () => {
  const leaveEditMode = vi.fn(() => window.history.replaceState(null, '', '/docs/page'));
  const { unmount } = mountGuard();

  act(() => confirmLeave(leaveEditMode));
  expect(leaveEditMode).toHaveBeenCalledTimes(1);
  window.history.replaceState(null, '', '/docs/page?edit=1');

  fireEvent.click(screen.getByText('Edit'));
  act(() => confirmLeave(leaveEditMode));
  expect(screen.getByRole('dialog')).toBeVisible();
  expect(leaveEditMode).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
  expect(leaveEditMode).toHaveBeenCalledTimes(1);
  expect(window.location.search).toBe('?edit=1');

  act(() => confirmLeave(leaveEditMode));
  fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
  // The confirmed URL change passes the history guard once; the next one is held.
  expect(leaveEditMode).toHaveBeenCalledTimes(2);
  expect(window.location.search).toBe('');
  act(() => window.history.pushState(null, '', '/docs/elsewhere'));
  expect(window.location.pathname).toBe('/docs/page');

  unmount();
  act(() => confirmLeave(leaveEditMode));
  expect(leaveEditMode).toHaveBeenCalledTimes(3);
});
