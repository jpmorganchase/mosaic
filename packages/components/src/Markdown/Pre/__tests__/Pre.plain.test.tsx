import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import { Pre } from '../Pre';

const { loadShiki } = vi.hoisted(() => ({ loadShiki: vi.fn() }));
vi.mock('shiki', () => {
  loadShiki();
  return { codeToHtml: vi.fn() };
});

test.each([undefined, '', 'text', 'plain', 'plaintext', 'txt', 'TEXT'])(
  'plain language %s never loads the browser highlighter',
  async language => {
    const { container } = render(<Pre code="plain <code> & text" language={language} />);
    await act(async () => vi.dynamicImportSettled());
    expect(container.querySelector('pre code')).toHaveTextContent('plain <code> & text');
    expect(loadShiki).not.toHaveBeenCalled();
  }
);

test('uses the code child and copies its original text without loading Shiki', async () => {
  const user = userEvent.setup();
  const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  render(
    <Pre>
      <code>{'plain <code> & text\n'}</code>
    </Pre>
  );
  await user.click(screen.getByRole('button', { name: 'Copy code' }));
  expect(writeText).toHaveBeenCalledExactlyOnceWith('plain <code> & text\n');
  expect(loadShiki).not.toHaveBeenCalled();
});

test('uses explicit and plugin HTML without loading Shiki, including refreshes', async () => {
  const { container, rerender } = render(<Pre html="<pre>First</pre>" language="ts" />);
  expect(container.querySelector('pre')).toHaveTextContent('First');
  rerender(
    <Pre>
      <code className="language-js" data-mosaic-html="<pre>Updated</pre>" />
    </Pre>
  );
  expect(container.querySelector('pre')).toHaveTextContent('Updated');
  await act(async () => vi.dynamicImportSettled());
  expect(loadShiki).not.toHaveBeenCalled();
});
