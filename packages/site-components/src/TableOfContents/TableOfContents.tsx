import React, { useEffect, useReducer } from 'react';
import { Caption1 } from '@jpmorganchase/mosaic-components';

import { TableOfContentsItem } from './TableOfContentsItem';
import styles from './styles.css';

export type Item = { level: number; id: string; text: string };

export interface CurrentItem extends Item {
  current: boolean;
}

export type TableOfContentsProps = {
  items?: Item[];
};

const initialState: { activeHeaders: HTMLElement[]; lastActiveHeader: HTMLElement | null } = {
  activeHeaders: [],
  lastActiveHeader: null
};

type ACTIONTYPE = { type: 'ADD'; payload: HTMLElement } | { type: 'REMOVE'; payload: HTMLElement };

function handleActiveHeaders(state: typeof initialState, action: ACTIONTYPE) {
  let newActiveHeaders = state.activeHeaders;

  switch (action.type) {
    case 'ADD':
      newActiveHeaders = [...state.activeHeaders, action.payload];
      break;
    case 'REMOVE':
      newActiveHeaders = state.activeHeaders.filter(old => old !== action.payload);
      break;
  }
  return {
    lastActiveHeader: newActiveHeaders.length === 0 ? action.payload : state.lastActiveHeader,
    activeHeaders: newActiveHeaders.sort((a, b) => a.offsetTop - b.offsetTop)
  };
}

function useActiveHeading(headings) {
  const [{ activeHeaders, lastActiveHeader }, dispatch] = useReducer(
    handleActiveHeaders,
    initialState
  );

  useEffect(() => {
    const { offsetHeight: headerHeight = 0 } = document.querySelector('header') || {};
    const handleEntries: IntersectionObserverCallback = entries => {
      entries.forEach(entry => {
        if (entry.intersectionRatio > 0.9) {
          dispatch({ type: 'ADD', payload: entry.target as HTMLElement });
        } else {
          dispatch({ type: 'REMOVE', payload: entry.target as HTMLElement });
        }
      });
    };

    const observer = new IntersectionObserver(handleEntries, {
      threshold: [0, 0.1, 0.5, 0.9, 1],
      rootMargin: `-${headerHeight}px 0px 0px 0px`
    });

    headings
      .map(({ id }) => document.getElementById(id))
      .forEach(heading => {
        if (heading) {
          observer.observe(heading);
        }
      });

    return () => {
      observer.disconnect();
    };
  }, [headings]);

  return activeHeaders[0]?.id ?? lastActiveHeader?.id;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ items }) => {
  if (!items) {
    throw new Error('No `items` specified for Table of Contents.');
  }

  const activeHeading = useActiveHeading(items);

  return items.length ? (
    <nav>
      <Caption1>On this Page</Caption1>
      <ul aria-label="Table of Contents" className={styles.list} role="tree">
        {items.map((item, i) => (
          <TableOfContentsItem
            selected={activeHeading === item.id}
            item={item}
            key={`TableOfContentsItem_${i}`}
          />
        ))}
      </ul>
    </nav>
  ) : null;
};
