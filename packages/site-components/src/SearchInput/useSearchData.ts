import { useSearchIndex } from '@jpmorganchase/mosaic-store';
import useSWR from 'swr';

export function useSearchData() {
  const fetcher = url => fetch(url).then(res => res.json());

  const { searchIndex: fallbackIndex, searchConfig } = useSearchIndex();

  const { data, error, isLoading: searchIsLoading } = useSWR('/search-data.json', fetcher);

  const searchIndex = searchIsLoading || error ? fallbackIndex : data;

  return { searchIndex, searchConfig };
}
