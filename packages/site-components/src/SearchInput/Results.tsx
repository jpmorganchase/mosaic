'use client';

import { startTransition, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Caption6, P4, P6 } from '@jpmorganchase/mosaic-components';
import { highlight } from '@jpmorganchase/mosaic-site-middleware/search/highlight';
import type { SearchHit, SearchResult } from '@jpmorganchase/mosaic-site-middleware/search';

import styles from './styles.css';

function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  return (
    <>
      {highlight(text, terms).map((segment, index) =>
        segment.match ? (
          <strong className={styles.highlight} key={index}>
            {segment.text}
          </strong>
        ) : (
          segment.text
        )
      )}
    </>
  );
}

export function ResultsList({
  searchResults,
  loading,
  error,
  handleClear
}: {
  searchResults: SearchResult[];
  loading: boolean;
  error: boolean;
  handleClear: () => void;
}) {
  const router = useRouter();
  const handleSelect = (event: MouseEvent<HTMLAnchorElement>, hit: SearchHit) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    startTransition(() => router.push(hit.href));
    handleClear();
  };

  return (
    <div className={styles.popper} role="region" aria-label="Search results" aria-busy={loading}>
      <div className={styles.resultsList}>
        {loading || error || searchResults.length === 0 ? (
          <div className={styles.item} role="status">
            <P4>
              {loading
                ? 'Searching…'
                : error
                ? 'Search is temporarily unavailable'
                : 'Nothing found'}
            </P4>
            {!loading && !error && <P6>Try searching for something else</P6>}
          </div>
        ) : (
          searchResults.map(result => (
            <article key={result.group} className={styles.item}>
              <a
                className={styles.resultLink}
                href={result.href}
                onClick={event => handleSelect(event, result)}
              >
                <Caption6>{result.headings.join(' › ') || result.route}</Caption6>
                <P4>
                  <Highlighted text={result.title} terms={result.terms} />
                </P4>
                <P6 className={styles.itemContent}>
                  <Highlighted text={result.snippet} terms={result.terms} />
                </P6>
              </a>
              {result.sections.map(section => (
                <a
                  key={section.id}
                  className={styles.sectionLink}
                  href={section.href}
                  onClick={event => handleSelect(event, section)}
                >
                  <Highlighted
                    text={section.headings.join(' › ') || section.title}
                    terms={section.terms}
                  />
                </a>
              ))}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
