import { useCallback, useEffect, useRef, useState } from 'react';
import { Input, Button } from '@salt-ds/core';
import { Icon } from '@jpmorganchase/mosaic-components';
import { useSearch } from './useSearch';
import { ResultsList } from './Results';
import styles from './styles.css';

export function SearchInput() {
  const [searchTerm, setSearchTerm] = useState('');
  const { enabled, results: searchResults, loading, error } = useSearch(searchTerm);
  const [listVisibility, setListVisibility] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = e => {
    const nextTerm = e.target.value;
    setSearchTerm(nextTerm);
    setListVisibility(true);
  };

  const handleClear = useCallback(() => {
    setSearchTerm('');
    inputRef.current?.focus();
  }, []);

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

  if (!enabled) return null;

  return (
    <div className={styles.root} ref={wrapperRef}>
      <Input
        bordered
        // Salt's `Input` puts its own props on the wrapper; the label must be
        // on the `<input>` for it to have an accessible name.
        inputProps={{ 'aria-label': 'Search' }}
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
      {searchTerm.trim().length > 0 && listVisibility && (
        <ResultsList
          searchResults={searchResults}
          handleClear={handleClear}
          loading={loading}
          error={error}
        />
      )}
    </div>
  );
}
