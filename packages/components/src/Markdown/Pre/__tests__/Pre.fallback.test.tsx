import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { Pre } from '../Pre';

const { codeToHtml } = vi.hoisted(() => ({ codeToHtml: vi.fn() }));
vi.mock('shiki', () => ({ codeToHtml }));

test('leaves plain code when the highlighter rejects an unsupported language', async () => {
  codeToHtml.mockRejectedValueOnce(new Error('Unknown language'));
  const { container } = render(<Pre code="Unsupported code" language="unknown-grammar" />);
  await waitFor(() => expect(codeToHtml).toHaveBeenCalledOnce());
  await act(async () => vi.dynamicImportSettled());
  expect(container.querySelector('pre code')).toHaveTextContent('Unsupported code');
});

test('shows new source immediately and ignores a stale highlight after a refresh', async () => {
  let resolveHighlight!: (html: string) => void;
  codeToHtml.mockImplementationOnce(
    () =>
      new Promise<string>(resolve => {
        resolveHighlight = resolve;
      })
  );
  const { container, rerender } = render(<Pre code="Old source" language="ts" />);
  await waitFor(() => expect(codeToHtml).toHaveBeenCalledOnce());
  rerender(<Pre code="New plain source" />);
  expect(container.querySelector('pre code')).toHaveTextContent('New plain source');
  await act(async () => resolveHighlight('<pre>Old highlighted source</pre>'));
  expect(container.querySelector('pre code')).toHaveTextContent('New plain source');
});
