import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const pathname = vi.hoisted(() => ({ current: '/mosaic/a/page' }));
const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ push })
}));
vi.mock('../useFolderSuggestions', () => ({
  useFolderSuggestions: () => ({
    folders: ['/mosaic/a', '/mosaic/b'],
    routes: ['/mosaic/a/page', '/mosaic/b/page']
  })
}));

const folderStatus = vi.hoisted(() => ({
  current: 'writable' as 'checking' | 'writable' | 'read-only' | 'unknown',
  folders: [] as (string | undefined)[]
}));
vi.mock('../useNewPageFolderCheck', () => ({
  useNewPageFolderCheck: (folder: string | undefined, enabled: boolean) => {
    folderStatus.folders.push(folder);
    return enabled && folder !== undefined ? folderStatus.current : undefined;
  }
}));

import { AuthoringSiteProvider } from '../../authoringSite';
import { NewPageDialog } from '../NewPageDialog';

const field = (label: 'Parent folder' | 'Filename' | 'Title') =>
  screen
    .getAllByLabelText(label, { exact: false })
    .find((element): element is HTMLInputElement => element instanceof HTMLInputElement)!;

describe('NewPageDialog', () => {
  afterEach(() => {
    cleanup();
    pathname.current = '/mosaic/a/page';
    folderStatus.current = 'writable';
    folderStatus.folders = [];
    push.mockReset();
  });

  const fillIn = (parent: string) => {
    fireEvent.change(field('Parent folder'), { target: { value: parent } });
    fireEvent.change(field('Filename'), { target: { value: 'new-page' } });
    fireEvent.change(field('Title'), { target: { value: 'New page' } });
  };
  const create = () => screen.getByRole('button', { name: 'Create' });

  it('refuses a folder new pages cannot be added to', () => {
    folderStatus.current = 'read-only';
    render(<NewPageDialog open onOpenChange={() => {}} />);
    fillIn('/test/');

    expect(create()).toBeDisabled();
    expect(folderStatus.folders.at(-1)).toBe('/test');
    expect(screen.getByText(/New pages can't be added to/).textContent).toContain('/test');
  });

  it('waits for the folder check before allowing Create', () => {
    folderStatus.current = 'checking';
    const { rerender } = render(<NewPageDialog open onOpenChange={() => {}} />);
    fillIn('/mosaic/new-folder');
    expect(create()).toBeDisabled();

    folderStatus.current = 'writable';
    rerender(<NewPageDialog open onOpenChange={() => {}} />);
    expect(create()).toBeEnabled();
    expect(screen.getByText(/New folder/)).toBeTruthy();
  });

  it("allows a folder when the site can't say", () => {
    folderStatus.current = 'unknown';
    render(<NewPageDialog open onOpenChange={() => {}} />);
    fillIn('/mosaic/a');
    expect(create()).toBeEnabled();
  });

  it('checks the root folder as /', () => {
    render(<NewPageDialog open onOpenChange={() => {}} />);
    fillIn('/');
    expect(folderStatus.folders.at(-1)).toBe('/');
  });

  it('creates the page here', () => {
    render(<NewPageDialog open onOpenChange={() => {}} />);
    fillIn('/mosaic/a');
    fireEvent.click(create());
    expect(push).toHaveBeenCalledExactlyOnceWith('/mosaic/a/new-page.mdx?new=1&title=New%20page');
  });

  it('creates the page on the authoring site when pages are edited there', () => {
    const originalLocation = window.location;
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign }
    });
    try {
      render(
        <AuthoringSiteProvider url="https://dev.example.com">
          <NewPageDialog open onOpenChange={() => {}} />
        </AuthoringSiteProvider>
      );
      fillIn('/mosaic/a');
      fireEvent.click(create());
      expect(assign).toHaveBeenCalledExactlyOnceWith(
        'https://dev.example.com/mosaic/a/new-page.mdx?new=1&title=New%20page'
      );
      expect(push).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    }
  });

  it('keeps the draft on the same page and starts a new one on another page', () => {
    const { rerender } = render(<NewPageDialog open onOpenChange={() => {}} />);
    expect(field('Parent folder').value).toBe('/mosaic/a');

    fireEvent.change(field('Filename'), { target: { value: 'draft' } });
    fireEvent.change(field('Title'), { target: { value: 'Draft' } });

    rerender(<NewPageDialog open={false} onOpenChange={() => {}} />);
    rerender(<NewPageDialog open onOpenChange={() => {}} />);
    expect(field('Filename').value).toBe('draft');
    expect(field('Title').value).toBe('Draft');

    rerender(<NewPageDialog open={false} onOpenChange={() => {}} />);
    pathname.current = '/mosaic/b/page';
    rerender(<NewPageDialog open={false} onOpenChange={() => {}} />);
    rerender(<NewPageDialog open onOpenChange={() => {}} />);

    expect(field('Filename').value).toBe('');
    expect(field('Title').value).toBe('');
    expect(field('Parent folder').value).toBe('/mosaic/b');
  });

  it('picks the new page folder when the page changes while the dialog is open', () => {
    const { rerender } = render(<NewPageDialog open onOpenChange={() => {}} />);
    fireEvent.change(field('Filename'), { target: { value: 'draft' } });

    pathname.current = '/mosaic/b/page';
    rerender(<NewPageDialog open onOpenChange={() => {}} />);

    expect(field('Filename').value).toBe('');
    expect(field('Parent folder').value).toBe('/mosaic/b');
  });
});
