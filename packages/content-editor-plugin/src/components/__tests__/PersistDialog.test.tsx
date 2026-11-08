import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
