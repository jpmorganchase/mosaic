type SearchDataPage = {
  title: string;
  content: string[];
  route: string;
};

export type SearchIndex = SearchDataPage[];

export type SearchIndexSlice = {
  searchIndex?: SearchIndex;
};
