import { afterEach, describe, expect, test, vi } from 'vitest';
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvents from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';

import { withAnchorHeading } from '../index';
import * as Heading from '../../Heading';

afterEach(() => vi.unstubAllGlobals());

describe('GIVEN an AnchoredHeading', () => {
  test('hydrates an authored link without nesting it inside the copy control', async () => {
    const TestHeading = withAnchorHeading(Heading.H2);
    const app = (
      <TestHeading id="documentation">
        Read <a href="/guide">the guide</a>
      </TestHeading>
    );
    const container = document.createElement('div');
    container.innerHTML = renderToString(app);
    document.body.appendChild(container);
    const heading = container.querySelector('h2');
    const authoredLink = container.querySelector('a[href="/guide"]');
    const onRecoverableError = vi.fn();
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      expect(heading).toContainElement(authoredLink as HTMLElement);
      await act(async () => {
        root = hydrateRoot(container, app, { onRecoverableError });
      });
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(container.querySelector('h2')).toBe(heading);
      expect(container.querySelector('a[href="/guide"]')).toBe(authoredLink);
      expect(container.querySelector('a a')).toBeNull();
      expect(heading).toHaveAttribute('id', 'documentation');
    } finally {
      if (root) await act(async () => root?.unmount());
      container.remove();
    }
  });
  describe('WHEN rendered', () => {
    test('THEN the Heading is rendered', () => {
      // arrange
      const TestHeading = withAnchorHeading(Heading.H1);
      render(<TestHeading LinkProps={{ link: 'http://example.com' }}>Mosaic Heading</TestHeading>);
      // assert
      expect(
        screen.getByRole('heading', { name: 'Mosaic Heading', exact: true })
      ).toBeInTheDocument();
    });
  });
  describe('WHEN clicked', () => {
    test('THEN the Heading is copied to the clipboard', async () => {
      // arrange
      let clipboardData = ''; // initalizing clipboard data so it can be used in testing
      const mockClipboard = {
        writeText: vi.fn(data => {
          clipboardData = data;
        }),
        readText: vi.fn(() => clipboardData)
      };
      vi.stubGlobal('navigator', { clipboard: mockClipboard });

      const TestHeading = withAnchorHeading(Heading.H1);
      render(
        <TestHeading LinkProps={{ link: 'http://example.com', title: 'Mosaic Title' }}>
          Mosaic Heading
        </TestHeading>
      );
      // assert
      expect(screen.queryByLabelText('copied anchor link to clipboard')).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Copy link to heading' })).toBeInTheDocument();
      expect(screen.queryByText('Mosaic Heading')).toBeInTheDocument();
      // act
      await userEvents.hover(screen.getByTitle('Mosaic Title'));
      // assert
      expect(screen.queryByLabelText('copied anchor link to clipboard')).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Copy link to heading' })).toBeInTheDocument();
      // act
      await userEvents.click(screen.getByTitle('Mosaic Title'));
      // assert
      expect(screen.queryByLabelText('copied anchor link to clipboard')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Copy link to heading' })).toBeInTheDocument();
      expect(clipboardData).toBe('http://example.com/');
    });
  });

  test('keeps authored links independent and supports keyboard copying', async () => {
    const user = userEvents.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    const followLink = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) =>
      event.preventDefault()
    );
    const TestHeading = withAnchorHeading(Heading.H2);
    render(
      <TestHeading id="guide">
        Read{' '}
        <a href="/guide" onClick={followLink}>
          the guide
        </a>
      </TestHeading>
    );
    await user.click(screen.getByRole('link', { name: 'the guide' }));
    expect(followLink).toHaveBeenCalledOnce();
    expect(writeText).not.toHaveBeenCalled();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Copy link to heading' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(writeText).toHaveBeenCalledExactlyOnceWith(new URL('#guide', window.location.href).href);
    expect(screen.getByRole('status')).toHaveTextContent('Copied');
  });
});
