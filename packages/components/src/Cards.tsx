import React, { Children, useId, type CSSProperties } from 'react';
import { GridLayout, GridItem, useBreakpoints, type GridLayoutProps } from '@salt-ds/core';

export type CardsProps = GridLayoutProps<'div'>;

const gridValue = (value: number | string) =>
  typeof value === 'number' ? `repeat(${value}, 1fr)` : value;

export const Cards: React.FC<CardsProps> = ({ children, columns = 12, style, ...rest }) => {
  // Provider breakpoint values are available during SSR. Unlike matched
  // breakpoints, they do not depend on the browser's viewport.
  const breakpoints = useBreakpoints();
  const id = useId();
  const responsive = typeof columns === 'object';
  const columnStyles: Record<string, string> = {};
  const rules: string[] = [];
  if (responsive) {
    // A sparse child grid must not inherit its parent's resolved columns before
    // the child's first breakpoint applies.
    rules.push(`[data-mosaic-cards="${id}"] { --mosaic-cards-columns: none; }`);
    for (const [name, width] of Object.entries(breakpoints).sort((a, b) => a[1] - b[1])) {
      const value = columns[name as keyof typeof breakpoints];
      if (value !== undefined) {
        columnStyles[`--mosaic-cards-columns-${name}`] = gridValue(value);
        rules.push(
          `@media (min-width: ${width}px) { [data-mosaic-cards="${id}"] { --mosaic-cards-columns: var(--mosaic-cards-columns-${name}); } }`
        );
      }
    }
  }
  return (
    <>
      {responsive ? <style>{rules.join('\n')}</style> : null}
      <GridLayout
        {...rest}
        data-mosaic-cards={id}
        columns={responsive ? 'var(--mosaic-cards-columns, none)' : columns}
        style={{ ...(style ?? { margin: '0px' }), ...columnStyles } as CSSProperties}
      >
        {Children.map(children, child => (child == null ? null : <GridItem>{child}</GridItem>))}
      </GridLayout>
    </>
  );
};
