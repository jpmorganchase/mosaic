import { useCallback, useEffect, useRef, useState } from 'react';
import { Input, Button } from '@salt-ds/core';
import { Icon } from '@jpmorganchase/mosaic-components';


import { performSearch } from './searchUtils';
import { ResultsList } from './Results';
import type { SearchResults } from './Results';
import styles from './styles.css';

export function SearchInput({ searchIndex, searchConfig }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults>([]);
  const [listVisibility, setListVisibility] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = e => {
    setSearchTerm(e.target.value);
    const results = performSearch(searchIndex, searchTerm, searchConfig);
    setSearchResults(results);
    setListVisibility(true);
  };

  const handleClear = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
    inputRef.current?.focus();
  }, [searchTerm, searchResults]);

  const handleInputFocus = () => {
    setListVisibility(true);
  };
  const handleEsc = e => {
    if (wrapperRef.current && wrapperRef.current.contains(e.target)) {
      if (e.keyCode === 27) {
        setListVisibility(false);
      }
    }
  };

  const handleClickOutside = e => {
    if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
      setListVisibility(false);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  if (!searchIndex || !searchConfig) {
    return null;
  }
  return (
    <div className={styles.root} ref={wrapperRef}>
      <Input
        aria-label="Search"
        startAdornment={<Icon name="search" />}
        endAdornment={
          searchTerm.length > 0 && (
            <Button variant="secondary" aria-label="Clear input" onClick={handleClear}>
              <Icon aria-hidden name="close" />
            </Button>
          )
        }
        value={searchTerm}
        onChange={handleSearch}
        onFocus={handleInputFocus}
        ref={inputRef}
      />
      {searchTerm.length > 0 && listVisibility && (
        <ResultsList searchResults={searchResults} handleClear={handleClear} query={searchTerm} />
      )}
    </div>
  );
}
