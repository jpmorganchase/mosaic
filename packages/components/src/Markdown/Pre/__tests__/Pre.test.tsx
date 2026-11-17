import { describe, expect, test } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';

import { Pre } from '../Pre';

describe('GIVEN a Pre without server-rendered HTML', () => {
  test.each([undefined, 'text', 'plain', 'plaintext', 'txt', 'ts'])(
    'THEN the initial HTML includes escaped code for language %s',
    language => {
      const code = '<script>alert("example")</script> & text';
      const container = document.createElement('div');
      container.innerHTML = renderToString(<Pre code={code} language={language} />);
      expect(container.querySelector('pre code')?.textContent).toBe(code);
      expect(container.querySelector('script')).toBeNull();
    }
  );

  test('THEN it highlights the code in the browser with light and dark themes', async () => {
    const { container } = render(
      <Pre>
        <code className="language-ts">{'const answer: number = 42;'}</code>
      </Pre>
    );

    const highlighted = await waitFor(
      () => {
        const pre = container.querySelector('pre.shiki');
        expect(pre).not.toBeNull();
        return pre!;
      },
      { timeout: 10_000 }
    );
    expect(highlighted.className).toContain('github-light');
    expect(highlighted.className).toContain('github-dark');
    expect(highlighted.textContent).toBe('const answer: number = 42;');
    expect(highlighted.querySelector('span[style*="--shiki-dark"]')).not.toBeNull();
  });
});

describe('GIVEN a Pre with server-rendered HTML', () => {
  test('THEN it shows that HTML without highlighting again', () => {
    const { container } = render(
      <Pre>
        <code className="language-ts" data-mosaic-html="<pre class='server'>done</pre>">
          {'done'}
        </code>
      </Pre>
    );

    expect(container.querySelector('pre.server')?.textContent).toBe('done');
    expect(container.querySelector('pre.shiki')).toBeNull();
  });
});
