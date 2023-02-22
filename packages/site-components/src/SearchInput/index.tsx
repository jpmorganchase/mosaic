import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FormField, SearchInput as SaltSearchInput } from '@salt-ds/lab';
import { useSearchIndex } from '@jpmorganchase/mosaic-store';

import { performSearch } from './searchUtils';
import { ResultsList } from './Results';
import type { SearchResults } from './Results';
import styles from './styles.css';

export function SearchInput() {
  const { searchIndex } = useSearchIndex();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults>([]);
  const [listVisibility, setListVisibility] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const handleSearch = e => {
    setSearchTerm(e.target.value);
  };

  const handleClear = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
  }, [searchTerm, searchResults]);

  useEffect(() => {
    const keys = ['title', 'content'];
    const results = performSearch(searchIndex, searchTerm, keys);
    setListVisibility(true);
    setSearchResults(results);
  }, [searchTerm]);

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

  return (
    <div className={styles.root} ref={wrapperRef}>
      <FormField style={{ minWidth: 200 }}>
        <SaltSearchInput
          value={searchTerm}
          onChange={handleSearch}
          onClear={handleClear}
          onFocus={handleInputFocus}
        />
      </FormField>
      {searchTerm.length > 0 && listVisibility && (
        <ResultsList searchResults={searchResults} handleClear={handleClear} query={searchTerm} />
      )}
    </div>
  );
}
