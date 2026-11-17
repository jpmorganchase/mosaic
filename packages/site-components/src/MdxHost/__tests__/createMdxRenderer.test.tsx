import React, { lazy } from 'react';
import { act, render, screen } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { serialize } from 'next-mdx-remote-client/serialize';
import type { SerializedMdxResult } from '@jpmorganchase/mosaic-types';
import { describe, expect, test, vi } from 'vitest';

import { createMdxRenderer } from '../createMdxRenderer';
import { Tag } from '../../../../components/src/Tag';
import { withAnchorHeading } from '../../../../components/src/Markdown/AnchorHeading';
import { H2 } from '../../../../components/src/Markdown/Heading';

// Keep these tests about the renderer contract, with real MDX evaluation and
// scope helpers. Individual interactive registry components have their own tests.
vi.mock('../../mdx', () => ({
  default: { p: (props: React.HTMLAttributes<HTMLParagraphElement>) => <p {...props} /> }
}));

const compile = (source: string, scope: Record<string, unknown> = {}) =>
  serialize({ source, options: { scope } });

async function hydrate(app: React.ReactNode, check: (container: HTMLDivElement) => Promise<void>) {
  const container = document.createElement('div');
  container.innerHTML = renderToString(app);
  document.body.appendChild(container);
  try {
    await check(container);
  } finally {
    container.remove();
  }
}

describe('createMdxRenderer', () => {
  test('keeps normal hydration and existing scope precedence', async () => {
    const Renderer = createMdxRenderer({
      scope: { greeting: 'host greeting', meta: { title: 'host title' } },
      suspense: { fallback: <span>Loading</span> }
    });
    const source = await compile(
      '{greeting}: {meta.title}; {helpers.limit({ max: 1 })(meta.items).join(",")}',
      { greeting: 'server greeting', meta: { title: 'server title', items: ['one', 'two'] } }
    );
    const app = <Renderer source={source} />;
    await hydrate(app, async container => {
      const paragraph = container.querySelector('p');
      const onRecoverableError = vi.fn();
      let root: ReturnType<typeof hydrateRoot> | undefined;
      try {
        await act(async () => {
          root = hydrateRoot(container, app, { onRecoverableError });
        });
        expect(container).toHaveTextContent('server greeting: server title; one');
        expect(container.querySelector('p')).toBe(paragraph);
        expect(onRecoverableError).not.toHaveBeenCalled();
      } finally {
        if (root) await act(async () => root?.unmount());
      }
    });
  });

  test('uses host components and scope when the page does not override them', async () => {
    const Renderer = createMdxRenderer({
      components: {
        p: (props: React.HTMLAttributes<HTMLParagraphElement>) => <p title="Host" {...props} />
      },
      scope: { greeting: 'host greeting' }
    });
    render(<Renderer source={await compile('Hello {greeting}')} />);
    expect(screen.getByTitle('Host')).toHaveTextContent('host greeting');
  });

  test.each([undefined, false] as const)(
    'does not add a boundary when suspense is %s',
    async suspense => {
      const Renderer = createMdxRenderer({ suspense });
      expect(renderToString(<Renderer source={await compile('Plain prose')} />)).toBe(
        '<p>Plain prose</p>'
      );
    }
  );

  test('isolates hydration recovery to the opted-in MDX body', async () => {
    let value = 'Server text';
    const Text = () => <span>{value}</span>;
    const Renderer = createMdxRenderer({ components: { Text }, suspense: {} });
    const source = await compile('<Text />');
    const app = (
      <>
        <header>Persistent header</header>
        <aside>Persistent sidebar</aside>
        <main>
          <Renderer source={source} />
        </main>
      </>
    );
    await hydrate(app, async container => {
      const header = container.querySelector('header');
      const sidebar = container.querySelector('aside');
      const body = container.querySelector('main span');
      value = 'Browser text';
      const onRecoverableError = vi.fn();
      let root: ReturnType<typeof hydrateRoot> | undefined;
      try {
        await act(async () => {
          root = hydrateRoot(container, app, { onRecoverableError });
        });
        expect(onRecoverableError).toHaveBeenCalledOnce();
        expect(container.querySelector('header')).toBe(header);
        expect(container.querySelector('aside')).toBe(sidebar);
        expect(container.querySelector('main span')).not.toBe(body);
        expect(container.querySelector('main')).toHaveTextContent('Browser text');
      } finally {
        if (root) await act(async () => root?.unmount());
      }
    });
  });

  test('uses the opted-in fallback when an authored component suspends', async () => {
    let resolve!: (module: { default: React.FC }) => void;
    const Delayed = lazy(
      () =>
        new Promise<{ default: React.FC }>(done => {
          resolve = done;
        })
    );
    const Renderer = createMdxRenderer({
      components: { Delayed },
      suspense: { fallback: <span>Waiting for content</span> }
    });
    render(<Renderer source={await compile('<Delayed />')} />);
    expect(screen.getByText('Waiting for content')).toBeInTheDocument();
    await act(async () => resolve({ default: () => <p>Ready content</p> }));
    expect(screen.queryByText('Waiting for content')).not.toBeInTheDocument();
    expect(screen.getByText('Ready content')).toBeInTheDocument();
  });

  test('still propagates compile errors to the host error boundary', () => {
    const Renderer = createMdxRenderer({ suspense: { fallback: 'Loading' } });
    const error = new Error('Invalid MDX at line 4');
    const source: SerializedMdxResult = { error, frontmatter: {}, scope: {} };
    expect(() => renderToString(<Renderer source={source} />)).toThrow(error);
  });

  test('hydrates compiled MDX with linked headings and inline tags', async () => {
    const Renderer = createMdxRenderer({ components: { h2: withAnchorHeading(H2), Tag } });
    const source = await compile(
      '## Read [the guide](/guide)\n\nAvailable as <Tag>RC</Tag> today.'
    );
    const app = <Renderer source={source} />;
    await hydrate(app, async container => {
      const heading = container.querySelector('h2');
      const paragraph = container.querySelector('p');
      expect(heading?.querySelector('a[href="/guide"]')).not.toBeNull();
      expect(paragraph).toHaveTextContent('Available as RC today.');
      const onRecoverableError = vi.fn();
      let root: ReturnType<typeof hydrateRoot> | undefined;
      try {
        await act(async () => {
          root = hydrateRoot(container, app, { onRecoverableError });
        });
        expect(onRecoverableError).not.toHaveBeenCalled();
        expect(container.querySelector('h2')).toBe(heading);
        expect(container.querySelector('p')).toBe(paragraph);
        expect(container.querySelector('a a')).toBeNull();
      } finally {
        if (root) await act(async () => root?.unmount());
      }
    });
  });
});
