import React, { useEffect, useRef, useState } from 'react';
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

export const TableOfContents: React.FC<TableOfContentsProps> = ({ items }) => {
  if (!items) {
    throw new Error('No `items` specified for Table of Contents.');
  }

  const [active, setActive] = useState('');
  const isNavigating = useRef(false);
  const scrollEndTimer = useRef<number | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (isNavigating.current) {
          return;
        }

        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
            return;
          }
        }
      },
      {
        rootMargin: '-10% 0px -90% 0%'
      }
    );

    items
      .map(({ id }) => document.getElementById(id))
      .forEach(heading => {
        if (heading) {
          observer.observe(heading);
        }
      });

    return () => {
      observer.disconnect();
    };
  }, [items]);

  useEffect(
    () => () => {
      if (scrollEndTimer.current) {
        window.clearTimeout(scrollEndTimer.current);
      }
    },
    []
  );

  return items.length ? (
    <nav>
      <Caption1>On this page</Caption1>
      <ul aria-label="Table of Contents" className={styles.list} role="tree">
        {items.map(item => (
          <TableOfContentsItem
            selected={active === item.id}
            item={item}
            key={item.id}
            onClick={event => {
              isNavigating.current = true;
              setActive(item.id);
              event.preventDefault();
              const target = document.getElementById(item.id);
              const { offsetHeight: headerHeight = 0 } = document.querySelector('header') || {};
              const hash = `#${item.id}`;
              const { offsetTop = 0 } = target || {};
              window.scrollTo({
                top: offsetTop - headerHeight,
                behavior: 'smooth'
              });
              if (window.history.pushState) {
                window.history.pushState(null, '', hash);
              } else {
                window.location.hash = hash;
              }

              const handleScroll = () => {
                if (scrollEndTimer.current) {
                  window.clearTimeout(scrollEndTimer.current);
                }

                scrollEndTimer.current = window.setTimeout(() => {
                  isNavigating.current = false;
                  window.removeEventListener('scroll', handleScroll);
                }, 100);
              };

              window.addEventListener('scroll', handleScroll);
            }}
          />
        ))}
      </ul>
    </nav>
  ) : null;
};
