import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import throttle from 'lodash/throttle';
import { Caption1, useSize } from '@jpmorganchase/mosaic-components';

import { TableOfContentsItem } from './TableOfContentsItem';
import { mostRecentScrollPoint, setupHeadingState, setupSelectedHeadingState } from './utils';
import styles from './styles.css';

export type Item = { level: number; id: string; text: string };
export interface CurrentItem extends Item {
  current: boolean;
}
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export type TableOfContentsProps = {
  items?: Item[];
};

export const TableOfContents: React.FC<TableOfContentsProps> = ({ items }) => {
  if (!items) {
    throw new Error('No `items` specified for Table of Contents.');
  }

  const headingsRef = useRef<CurrentItem[]>(setupHeadingState(items));
  const [selectedHeading, setSelectedHeading] = useState(() =>
    setupSelectedHeadingState(headingsRef.current)
  );

  const headingPositions = useRef<(number | null)[]>([]);

  const size = useSize();

  const matchHeadingsToDOM = () => {
    const { offsetHeight: headerHeight = 0 } = document.querySelector('header') || {};
    const updatedHeadingPositions = headingsRef.current
      .map(heading => {
        const headingNode = document.getElementById(heading.id);
        return headingNode ? headingNode.offsetTop - headerHeight : null;
      })
      .filter(heading => heading);
    if (updatedHeadingPositions.length > 0) {
      headingPositions.current = updatedHeadingPositions;
      handleScroll(true);
    }
  };

  const handleScroll = (skipCheck = false) => {
    if (
      !skipCheck &&
      (headingPositions.current.length < 1 ||
        headingPositions.current.length !== headingsRef.current.length)
    ) {
      matchHeadingsToDOM();
    } else {
      const scrollPosition = window.scrollY;
      const newCurrent = mostRecentScrollPoint(scrollPosition, headingPositions.current);

      // Only update the current item if we have a valid item (the
      // falsy `0` is a valid option here, hence checking type)
      if (typeof newCurrent === 'number') {
        const currentHeading = headingsRef.current[newCurrent];
        if (currentHeading) {
          setSelectedHeading(currentHeading.id);
        }
      }
    }
  };

  useEffect(() => {
    const throttledHandleScroll = throttle(() => handleScroll(false), 60);

    document.addEventListener('scroll', throttledHandleScroll);
    return () => {
      document.removeEventListener('scroll', throttledHandleScroll);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    matchHeadingsToDOM();
  }, [size.width, size.height]);

  useEffect(() => {
    const newHeadings = setupHeadingState(items);
    headingsRef.current = newHeadings;
    if (headingPositions.current.length !== items.length) {
      matchHeadingsToDOM();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  return items.length ? (
    <nav>
      <Caption1>On this Page</Caption1>
      <ul aria-label="Table of Contents" className={styles.list} role="tree">
        {items.map((item, i) => (
          <TableOfContentsItem
            current={selectedHeading}
            item={item}
            key={`TableOfContentsItem_${i}`}
          />
        ))}
      </ul>
    </nav>
  ) : null;
};
