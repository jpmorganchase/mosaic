import React from 'react';
import { act, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { SaltProvider } from '@salt-ds/core';
import { expect, test, vi } from 'vitest';

import { Cards } from '../Cards';

test('keeps numeric columns, grid items, spacing and caller styles', () => {
  const { container } = render(
    <Cards columns={3} gap={2} rowGap="12px" style={{ margin: '8px' }}>
      <div>One</div>
      <div>Two</div>
    </Cards>
  );
  const grid = container.querySelector<HTMLElement>('.saltGridLayout')!;
  expect(grid.style.getPropertyValue('--gridLayout-columns')).toBe('repeat(3, 1fr)');
  expect(grid.style.getPropertyValue('--gridLayout-columnGap')).toBe(
    'calc(var(--salt-spacing-100) * 2)'
  );
  expect(grid.style.getPropertyValue('--gridLayout-rowGap')).toBe('12px');
  expect(grid.style.margin).toBe('8px');
  expect(grid.querySelectorAll(':scope > .saltGridItem')).toHaveLength(2);
  expect(container.querySelector('style')).toBeNull();
});

test('renders responsive columns as scoped CSS using provider breakpoints', async () => {
  const app = (
    <SaltProvider breakpoints={{ xs: 0, sm: 500, md: 800, lg: 1100, xl: 1500 }}>
      <Cards columns={{ xs: 1, sm: 2, lg: 'repeat(3, minmax(0, 1fr))' }}>
        <div>One</div>
        <div>Two</div>
      </Cards>
    </SaltProvider>
  );
  const container = document.createElement('div');
  container.innerHTML = renderToString(app);
  document.body.appendChild(container);
  const grid = container.querySelector<HTMLElement>('.saltGridLayout')!;
  const rules = container.querySelector('style')?.textContent;
  expect(rules).toContain('(min-width: 500px)');
  expect(rules).toContain('(min-width: 1100px)');
  expect(rules).not.toContain('(min-width: 800px)');
  expect(grid.style.getPropertyValue('--gridLayout-columns')).toBe(
    'var(--mosaic-cards-columns, none)'
  );
  expect(grid.style.getPropertyValue('--mosaic-cards-columns-sm')).toBe('repeat(2, 1fr)');
  expect(grid.style.getPropertyValue('--mosaic-cards-columns-lg')).toBe(
    'repeat(3, minmax(0, 1fr))'
  );
  const onRecoverableError = vi.fn();
  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    await act(async () => {
      root = hydrateRoot(container, app, { onRecoverableError });
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.querySelector('.saltGridLayout')).toBe(grid);
    expect(container.querySelector('style')?.textContent).toBe(rules);
  } finally {
    if (root) await act(async () => root?.unmount());
    container.remove();
  }
});

test('scopes independent grids and updates responsive values', () => {
  const { container, rerender } = render(
    <>
      <Cards columns={{ xs: 1, sm: 2 }}>
        <div>First</div>
      </Cards>
      <Cards columns={{ xs: 3 }}>
        <div>Second</div>
      </Cards>
    </>
  );
  const grids = [...container.querySelectorAll<HTMLElement>('[data-mosaic-cards]')];
  expect(grids[0].dataset.mosaicCards).not.toBe(grids[1].dataset.mosaicCards);
  rerender(
    <Cards columns={{ xs: 4 }}>
      <div>Updated</div>
    </Cards>
  );
  expect(
    container
      .querySelector<HTMLElement>('.saltGridLayout')
      ?.style.getPropertyValue('--mosaic-cards-columns-xs')
  ).toBe('repeat(4, 1fr)');
});
