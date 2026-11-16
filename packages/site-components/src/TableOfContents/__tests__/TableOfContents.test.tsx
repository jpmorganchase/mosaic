import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { TableOfContents, type Item } from '../TableOfContents';

const items: Item[] = [
  { id: 'first', level: 2, text: 'First' },
  { id: 'second', level: 2, text: 'Second' }
];
const positions = new Map<string, number>();
let resized: () => void;
const disconnect = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  positions.clear();
  positions.set('first', 0);
  positions.set('second', 500);
  document.body.innerHTML =
    '<header></header><main><h1 id="unlisted">Title</h1><h2 id="first">First</h2><div style="position:relative"><h2 id="second">Second</h2></div></main>';
  vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0);
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(4000);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    return {
      top: (positions.get(this.id) ?? 0) - window.scrollY,
      height: this.tagName === 'HEADER' ? 44 : 20
    } as DOMRect;
  });
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resized = callback;
      }
      observe() {}
      unobserve() {}
      disconnect = disconnect;
    }
  );
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const selected = (name: string) =>
  expect(screen.getByRole('link', { name })).toHaveClass('saltNavigationItem-active');
const scroll = (top: number) => {
  vi.spyOn(window, 'scrollY', 'get').mockReturnValue(top);
  act(() => {
    fireEvent.scroll(document);
    vi.advanceTimersByTime(60);
  });
};

test('tracks only supplied headings, preserves zero positions and offsets the header once', () => {
  render(<TableOfContents items={items} />);
  selected('First');
  scroll(420);
  selected('First');
  scroll(456);
  selected('Second');
});

test('missing headings do not shift another heading to the wrong item', () => {
  document.getElementById('first')?.remove();
  render(<TableOfContents items={items} />);
  selected('Second');
});

test('selects a short final section when scrolling is clamped at the document bottom', () => {
  positions.set('first', 100);
  positions.set('second', 900);
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(1000);
  render(<TableOfContents items={items} />);
  selected('First');
  scroll(1000 - window.innerHeight);
  selected('Second');
});

test('remeasures after late content shifts and after navigation with the same item count', () => {
  const view = render(<TableOfContents items={items} />);
  scroll(456);
  selected('Second');
  positions.set('second', 800);
  act(() => {
    resized();
    vi.advanceTimersByTime(60);
  });
  selected('First');
  positions.set('second', 300);
  scroll(456);
  selected('Second');
  document.querySelector('main')!.innerHTML =
    '<h2 id="new-first">New first</h2><h2 id="new-second">New second</h2>';
  positions.set('new-first', 100);
  positions.set('new-second', 1000);
  view.rerender(
    <TableOfContents
      items={[
        { id: 'new-first', text: 'New first', level: 2 },
        { id: 'new-second', text: 'New second', level: 2 }
      ]}
    />
  );
  selected('New first');
});

test.each([false, true])(
  'scrolls to document coordinates with reduced motion %s',
  reducedMotion => {
    vi.mocked(window.matchMedia).mockImplementation(
      query =>
        ({ matches: reducedMotion && query.includes('prefers-reduced-motion') } as MediaQueryList)
    );
    render(<TableOfContents items={items} />);
    scroll(200);
    fireEvent.click(screen.getByRole('link', { name: 'Second' }));
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 456,
      behavior: reducedMotion ? 'instant' : 'smooth'
    });
    expect(window.location.hash).toBe('#second');
  }
);

test('leaves modified clicks and missing targets to the browser', () => {
  render(<TableOfContents items={items} />);
  const link = screen.getByRole('link', { name: 'Second' });
  fireEvent.click(link, { ctrlKey: true });
  document.getElementById('second')?.remove();
  fireEvent.click(link);
  expect(window.scrollTo).not.toHaveBeenCalled();
});

test('encodes heading IDs and clears pending scroll work on unmount', () => {
  const heading = document.getElementById('first')!;
  heading.id = 'café & tea';
  positions.set(heading.id, 0);
  const view = render(<TableOfContents items={[{ id: heading.id, text: 'Tea', level: 2 }]} />);
  const link = screen.getByRole('link', { name: 'Tea' });
  expect(link).toHaveAttribute('href', '#caf%C3%A9%20%26%20tea');
  fireEvent.click(link);
  expect(window.location.hash).toBe('#caf%C3%A9%20%26%20tea');
  scroll(1);
  fireEvent.scroll(document);
  view.unmount();
  expect(disconnect).toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
