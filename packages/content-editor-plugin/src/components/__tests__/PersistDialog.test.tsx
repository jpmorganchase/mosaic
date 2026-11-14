import { beforeEach, describe, expect, test, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const saveState = vi.hoisted(() => ({
  markSaving: vi.fn(),
  markSaved: vi.fn(),
  markSaveFailed: vi.fn()
}));
vi.mock('../../EditorContext', () => ({ useSaveState: () => saveState }));

import { PersistDialog, type PersistEvent } from '../PersistEditDialog';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PersistDialog', () => {
  const source = '/docs/page.mdx';
  const changedBody = () => '# Updated page';
  const defaults = () =>
    Promise.resolve({ supportsCommitMessage: true as const, commitMessage: 'Source default' });
  const baseProps = {
    open: true,
    onOpenChange: vi.fn(),
    meta: { route: source },
    getCurrentMarkdown: changedBody
  };

  test('prefills the source default, submits the author message and resets after success', async () => {
    const persist = vi.fn(async function* (): AsyncGenerator<PersistEvent> {
      yield { kind: 'complete', prHref: null };
    });
    const { rerender } = render(
      <PersistDialog {...baseProps} loadSaveDefaults={defaults} persist={persist} />
    );
    const field = await screen.findByRole('textbox', { name: 'Commit message' });
    expect(field).toHaveValue('Source default');
    await userEvent.clear(field);
    await userEvent.type(field, 'Explain why{enter}{enter}Details');
    await userEvent.click(screen.getByRole('button', { name: 'Raise Pull Request' }));
    await screen.findByRole('heading', { name: 'Changes Saved Successfully' });
    expect(persist).toHaveBeenCalledExactlyOnceWith({
      route: source,
      markdown: '# Updated page',
      commitMessage: 'Explain why\n\nDetails'
    });
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    rerender(
      <PersistDialog {...baseProps} open={false} loadSaveDefaults={defaults} persist={persist} />
    );
    rerender(<PersistDialog {...baseProps} loadSaveDefaults={defaults} persist={persist} />);
    expect(await screen.findByRole('textbox', { name: 'Commit message' })).toHaveValue(
      'Source default'
    );
  });

  test('keeps the author draft after failure and close/reopen; reset restores the default', async () => {
    const persist = vi.fn(async function* (): AsyncGenerator<PersistEvent> {
      yield { kind: 'error', message: 'Try again' };
    });
    const { rerender } = render(
      <PersistDialog {...baseProps} loadSaveDefaults={defaults} persist={persist} />
    );
    const field = await screen.findByRole('textbox', { name: 'Commit message' });
    await userEvent.clear(field);
    await userEvent.type(field, 'My explanation');
    await userEvent.click(screen.getByRole('button', { name: 'Raise Pull Request' }));
    await screen.findByText('Error - Try again');
    expect(field).toHaveValue('My explanation');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    rerender(
      <PersistDialog {...baseProps} open={false} loadSaveDefaults={defaults} persist={persist} />
    );
    rerender(<PersistDialog {...baseProps} loadSaveDefaults={defaults} persist={persist} />);
    const reopenedField = await screen.findByRole('textbox', { name: 'Commit message' });
    expect(reopenedField).toHaveValue('My explanation');
    expect(screen.getByRole('button', { name: 'Raise Pull Request' })).toBeDisabled();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Reset to default' })).toBeEnabled()
    );
    await userEvent.click(screen.getByRole('button', { name: 'Reset to default' }));
    expect(reopenedField).toHaveValue('Source default');
  });

  test('keeps unsupported workflows saveable without a message field or payload', async () => {
    const unsupported = async () => ({ supportsCommitMessage: false as const });
    const persist = vi.fn(async function* (): AsyncGenerator<PersistEvent> {
      yield { kind: 'complete', prHref: null };
    });
    render(<PersistDialog {...baseProps} loadSaveDefaults={unsupported} persist={persist} />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Raise Pull Request' })).toBeEnabled()
    );
    expect(screen.queryByRole('textbox', { name: 'Commit message' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Raise Pull Request' }));
    expect(persist).toHaveBeenCalledExactlyOnceWith({ route: source, markdown: '# Updated page' });
  });

  test('message-only edits cannot bypass the no-op guard and blank messages block real saves', async () => {
    const persist = vi.fn();
    const { rerender } = render(
      <PersistDialog
        {...baseProps}
        originalMarkdown="# Updated page"
        loadSaveDefaults={defaults}
        persist={persist}
      />
    );
    const field = await screen.findByRole('textbox', { name: 'Commit message' });
    await userEvent.type(field, ' Extra');
    expect(screen.getByRole('button', { name: 'Raise Pull Request' })).toBeDisabled();
    rerender(
      <PersistDialog
        {...baseProps}
        originalMarkdown="# Original"
        loadSaveDefaults={defaults}
        persist={persist}
      />
    );
    await userEvent.clear(field);
    expect(screen.getByRole('button', { name: 'Raise Pull Request' })).toBeDisabled();
    expect(screen.getByText('Enter a commit message.')).toBeVisible();
    expect(persist).not.toHaveBeenCalled();
  });

  test('updates untouched suggestions on rename but preserves an override through refresh errors', async () => {
    const load = vi.fn(async ({ targetRoute }) => ({
      supportsCommitMessage: true as const,
      commitMessage: targetRoute ? `Rename to ${targetRoute}` : 'Update page'
    }));
    render(<PersistDialog {...baseProps} loadSaveDefaults={load} persist={vi.fn()} />);
    const field = await screen.findByRole('textbox', { name: 'Commit message' });
    const path = screen.getByRole('textbox', { name: 'File path' });
    await userEvent.clear(path);
    await userEvent.type(path, '/docs/renamed.mdx');
    await waitFor(() => expect(field).toHaveValue('Rename to /docs/renamed.mdx'));
    await userEvent.clear(field);
    await userEvent.type(field, 'Keep my explanation');
    load.mockRejectedValue(new Error('Backend unavailable'));
    await userEvent.clear(path);
    await userEvent.type(path, '/docs/again.mdx');
    await screen.findByText('Could not load the commit message. Try again.');
    expect(field).toHaveValue('Keep my explanation');
    load.mockResolvedValue({ supportsCommitMessage: true, commitMessage: 'New suggestion' });
    await userEvent.click(screen.getByRole('button', { name: 'Retry commit message' }));
    await waitFor(() =>
      expect(screen.queryByText('Loading commit message…')).not.toBeInTheDocument()
    );
    expect(field).toHaveValue('Keep my explanation');
  });

  test('ignores a late default response from another document', async () => {
    let finish: (value: { supportsCommitMessage: true; commitMessage: string }) => void;
    const load = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finish = resolve;
          })
      )
      .mockResolvedValue({ supportsCommitMessage: true, commitMessage: 'Second source default' });
    const { rerender } = render(
      <PersistDialog {...baseProps} loadSaveDefaults={load} persist={vi.fn()} />
    );
    await waitFor(() => expect(load).toHaveBeenCalledOnce());
    rerender(
      <PersistDialog
        {...baseProps}
        meta={{ route: '/other/page.mdx' }}
        loadSaveDefaults={load}
        persist={vi.fn()}
      />
    );
    expect(await screen.findByRole('textbox', { name: 'Commit message' })).toHaveValue(
      'Second source default'
    );
    await act(async () => finish({ supportsCommitMessage: true, commitMessage: 'Stale source' }));
    expect(screen.getByRole('textbox', { name: 'Commit message' })).toHaveValue(
      'Second source default'
    );
  });
  test('shows a successful save without a URL and prevents a duplicate submission', async () => {
    const onOpenChange = vi.fn();
    const persist = vi.fn(async function* (): AsyncGenerator<PersistEvent> {
      yield { kind: 'complete', prHref: null };
    });
    render(
      <PersistDialog
        open
        onOpenChange={onOpenChange}
        meta={{ route: '/docs/new-section.mdx' }}
        getCurrentMarkdown={() => ''}
        getCurrentAuthoredFrontmatter={() => 'title: New section'}
        isNewPage
        persist={persist}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Create Page' }));

    expect(
      await screen.findByRole('heading', { name: 'Changes Saved Successfully' })
    ).toBeVisible();
    expect(await screen.findByText('Your changes were saved successfully.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Create Page' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(persist).toHaveBeenCalledExactlyOnceWith({
      route: '/docs/new-section.mdx',
      markdown: '',
      frontmatter: 'title: New section',
      isNewPage: true
    });
    expect(saveState.markSaved).toHaveBeenCalledOnce();
    expect(saveState.markSaveFailed).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(persist).toHaveBeenCalledOnce();
  });

  test('shows the pull request link when the successful save supplies one', async () => {
    const pullRequestUrl = 'https://github.com/example/docs/pull/1';
    const persist = async function* (): AsyncGenerator<PersistEvent> {
      yield { kind: 'complete', prHref: pullRequestUrl };
    };
    render(
      <PersistDialog
        open
        onOpenChange={vi.fn()}
        meta={{ route: '/docs/page.mdx' }}
        getCurrentMarkdown={() => '# Updated page'}
        persist={persist}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Raise Pull Request' }));

    expect(
      await screen.findByRole('heading', { name: 'Pull Request Created Successfully' })
    ).toBeVisible();
    expect(
      await screen.findByRole('link', { name: /^A Pull Request for your changes has been created/ })
    ).toHaveAttribute('href', pullRequestUrl);
    expect(screen.getByRole('button', { name: 'Raise Pull Request' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled();
  });
});
