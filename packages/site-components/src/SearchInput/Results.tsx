import React, { useState } from 'react';
import { useRouter } from 'next/router';
import classnames from 'classnames';
import { Caption6, P4, P6 } from '@jpmorganchase/mosaic-components';
import { Highlighter } from '@salt-ds/lab';

import styles from './styles.css';

interface SearchResult {
  title: string;
  route: string;
  content: string;
}

export type SearchResults = SearchResult[];
type SearchResultsListProps = {
  searchResults: SearchResults;
  query: string;
  handleClear: () => void;
};

interface ResultListItemProps {
  result: SearchResult;
  query: string;
  onSelect: (result) => void;
}

function ResultListItem({ result, query, onSelect }: ResultListItemProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleMouseEnter = () => {
    setHovered(true);
  };
  const handleMouseLeave = () => {
    setHovered(false);
  };
  const handleFocus = () => {
    setFocused(true);
  };
  const handleBlur = () => {
    setFocused(false);
  };

  const handleSelect = () => {
    onSelect(result);
  };

  const handleKeySelection = e => {
    if (e.keyCode === (13 || 32)) {
      onSelect(result);
    }
  };

  const itemActive = hovered || focused;

  return (
    <article
      role="link"
      tabIndex={0}
      className={classnames(styles.item, {
        [styles.itemActive]: itemActive,
        [styles.itemInactive]: !itemActive
      })}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={handleSelect}
      onKeyDown={handleKeySelection}
    >
      <Caption6>
        <Highlighter
          matchPattern={new RegExp(`(${query.trim().split(' ').join('|')})`, 'gi')}
          text={result.route.replace(/(<([^>]+)>)/gi, '')}
        />
      </Caption6>
      <P4>
        <Highlighter
          matchPattern={new RegExp(`(${query.trim().split(' ').join('|')})`, 'gi')}
          text={result.title.replace(/(<([^>]+)>)/gi, '')}
        />
      </P4>
      <P6 className={styles.itemContent}>
        <span dangerouslySetInnerHTML={{ __html: result.content }} />
      </P6>
    </article>
  );
}

function ResultListItemEmpty() {
  return (
    <article className={styles.item}>
      <P4 className={styles.itemContent}>Nothing found</P4>
      <P6 className={styles.itemContent}>Try searching for something else</P6>
    </article>
  );
}

export function ResultsList({ searchResults, query, handleClear }: SearchResultsListProps) {
  const router = useRouter();

  const handleSelect = (result: SearchResult) => {
    router.push(result.route);
    handleClear();
  };

  return (
    <div className={styles.popper} role="tooltip">
      <div className={styles.resultsList}>
        {searchResults.length > 0 ? (
          searchResults.map(result => (
            <ResultListItem
              key={`result-item-${result.route}`}
              result={result}
              query={query}
              onSelect={handleSelect}
            />
          ))
        ) : (
          <ResultListItemEmpty />
        )}
      </div>
    </div>
  );
}
