import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const pathname = vi.hoisted(() => ({ current: '/mosaic/a/page' }));
vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ push: vi.fn() })
}));
vi.mock('../useFolderSuggestions', () => ({
  useFolderSuggestions: () => ({
    folders: ['/mosaic/a', '/mosaic/b'],
    routes: ['/mosaic/a/page', '/mosaic/b/page']
  })
}));

import { NewPageDialog } from '../NewPageDialog';

const field = (label: 'Parent folder' | 'Filename' | 'Title') =>
  screen
    .getAllByLabelText(label, { exact: false })
    .find((element): element is HTMLInputElement => element instanceof HTMLInputElement)!;

describe('NewPageDialog', () => {
  afterEach(() => {
    cleanup();
    pathname.current = '/mosaic/a/page';
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
