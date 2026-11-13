import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { EditorProvider, useSaveState } from '../../EditorContext';
import { LeaveGuardPlugin } from '../../plugins/LeaveGuardPlugin';

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
  window.history.replaceState(null, '', '/');
});

function mountGuard() {
  render(
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
