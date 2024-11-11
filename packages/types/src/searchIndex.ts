type SearchDataPage = {
  title: string;
  content: string[];
  route: string;
};

export type SearchIndex = SearchDataPage[];

export type SearchConfig = {
  includeScore?: boolean;
  includeMatches?: boolean;
  maxPatternLength?: number;
  ignoreLocation?: boolean;
  threshold?: number;
  keys?: string[] | { name: string; weight: number }[];
};
