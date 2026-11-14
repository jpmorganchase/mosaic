import MiniSearch, { type SearchResult as MiniSearchResult } from 'minisearch';

import { snippet } from './highlight.js';
import type {
  MosaicSearchIndex,
  SearchHit,
  SearchIndexOptions,
  SearchOptions,
  SearchRecord,
  SearchResult
} from './types.js';

const FIELDS = ['title', 'compactTitle', 'keywords', 'headings', 'description', 'text'] as const;
type Field = typeof FIELDS[number];

// Lower is better: where in a record a query word matched.
const FIELD_RANK: Record<Field, number> = {
  title: 0,
  compactTitle: 0,
  keywords: 1,
  headings: 2,
  description: 3,
  text: 4
};
const UNMATCHED_RANK = 5;
// Weights the relevance score: the last tie-break, and which hits are kept when
// there are more than MAX_CANDIDATES. The ranking itself uses FIELD_RANK.
const BOOST: Record<Field, number> = {
  title: 6,
  compactTitle: 6,
  keywords: 4,
  headings: 3,
  description: 1.5,
  text: 1
};
const MAX_CANDIDATES = 2000;

const STOP_WORDS = new Set(
  'a an and are as at be by can do does for from how i if in is it of on or that the this to what when where which with why you'.split(
    ' '
  )
);

const tokenize = MiniSearch.getDefault('tokenize') as (text: string) => string[];
const words = (text: string) =>
  tokenize(text)
    .map(term => term.toLowerCase())
    .filter(Boolean);
/** Text as one lowercase word without spaces or stop words, to compare titles with queries. */
const comparable = (terms: string[]) => {
  const meaningful = terms.filter(term => !STOP_WORDS.has(term));
  return (meaningful.length > 0 ? meaningful : terms).join('');
};
const joinField = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value.join(' ') : value ?? '';

// Like Algolia: no typos in short words, one from 4 letters, two from 8.
const allowedEdits = (word: string) => (word.length >= 8 ? 2 : word.length >= 4 ? 1 : 0);

function editDistance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) {
    return max + 1;
  }
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      rowMin = Math.min(rowMin, current[j]);
    }
    if (rowMin > max) {
      return max + 1;
    }
    previous = current;
  }
  return previous[b.length];
}

/** The word's singular and plural forms, so "colour" finds "colours", like Algolia's `ignorePlurals`. */
function withPlurals(word: string) {
  const forms = [word];
  if (word.length < 3) {
    return forms;
  }
  if (word.endsWith('ies')) {
    forms.push(`${word.slice(0, -3)}y`);
  } else if (word.endsWith('es')) {
    forms.push(word.slice(0, -2), word.slice(0, -1));
  } else if (word.endsWith('s') && !word.endsWith('ss')) {
    forms.push(word.slice(0, -1));
  } else if (/[^aeiou]y$/.test(word)) {
    forms.push(`${word.slice(0, -1)}ies`);
  } else {
    forms.push(`${word}s`);
  }
  if (/(s|x|z|ch|sh)$/.test(word)) {
    forms.push(`${word}es`);
  }
  return forms;
}

interface QueryWord {
  word: string;
  /** The word's singular and plural forms. */
  forms: string[];
  /** The forms of the word's synonyms. */
  synonyms: string[];
  prefix: boolean;
  edits: number;
}

type MatchKind = 'exact' | 'synonym' | 'prefix' | 'typo';
const KIND_ORDER: Record<MatchKind, number> = { exact: 0, synonym: 1, prefix: 2, typo: 3 };

function classify(queryWord: QueryWord, term: string): MatchKind | undefined {
  if (queryWord.forms.includes(term)) {
    return 'exact';
  }
  if (queryWord.synonyms.includes(term)) {
    return 'synonym';
  }
  if (queryWord.prefix && term.startsWith(queryWord.word)) {
    return 'prefix';
  }
  if (
    queryWord.edits > 0 &&
    editDistance(queryWord.word, term, queryWord.edits) <= queryWord.edits
  ) {
    return 'typo';
  }
  return undefined;
}

interface WordMatch {
  kind: MatchKind;
  rank: number;
  term: string;
}

/**
 * For each query word: its best match in the hit, and every way it can be
 * spelled in the hit (the word, or a plural, synonym or typo it matched).
 */
function matchWords(queryWords: QueryWord[], hit: MiniSearchResult) {
  const matched = Object.entries(hit.match) as [string, Field[]][];
  return queryWords.map(queryWord => {
    let best: WordMatch | undefined;
    const spellings = new Set([queryWord.word]);
    for (const [term, fields] of matched) {
      const kind = classify(queryWord, term);
      if (!kind) {
        continue;
      }
      if (kind !== 'prefix') {
        spellings.add(term);
      }
      const rank = Math.min(...fields.map(field => FIELD_RANK[field]));
      if (
        !best ||
        KIND_ORDER[kind] < KIND_ORDER[best.kind] ||
        (kind === best.kind && rank < best.rank)
      ) {
        best = { kind, rank, term };
      }
    }
    return { best, spellings: [...spellings] };
  });
}

/** Whether `key` is the query words in order, each spelled one of its ways, with nothing else. */
function spells(key: string, spellings: string[][], i = 0): boolean {
  if (i === spellings.length) {
    return key === '';
  }
  return spellings[i].some(
    spelling => key.startsWith(spelling) && spells(key.slice(spelling.length), spellings, i + 1)
  );
}

const compareKeys = (a: number[], b: number[]) => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return a[i] - b[i];
    }
  }
  return 0;
};

/**
 * The hit's matched terms, with a match on the title without spaces
 * ("datepicker") swapped for the title's words, so "Date picker" can be highlighted.
 */
function highlightTerms(record: SearchRecord, hit: MiniSearchResult) {
  const titleWords = words(record.title);
  const compactTitle = titleWords.join('');
  return [
    ...new Set(
      hit.terms.flatMap(term =>
        term === compactTitle && titleWords.length > 1 ? titleWords : [term]
      )
    )
  ];
}

const defaultPageRank = (record: SearchRecord) => (/\/index$/.test(record.route) ? 0 : 1);

/**
 * Builds a search index over the records from `search-records.json`. It runs
 * in Node and in the browser.
 *
 * Results are ranked like Algolia's tie-breaking criteria, each one only
 * deciding between results that tie on the ones before it:
 *
 * 1. the number of query words matched;
 * 2. the page title matching the whole query, ignoring plurals, stop words and spaces;
 * 3. the current namespace (see `SearchOptions.namespace`);
 * 4. the number of typos;
 * 5. the number of words matched by a synonym;
 * 6. where the words matched: title, then keywords, headings, description and text;
 * 7. the section heading matching the whole query;
 * 8. `pageRank`;
 * 9. the page introduction before its sections, and outer sections before inner ones;
 * 10. the relevance score (BM25).
 *
 * Only results that match the most query words are returned, so adding a
 * word narrows the results, as it does in Algolia.
 */
export function createSearchIndex(
  records: SearchRecord[],
  options: SearchIndexOptions = {}
): MosaicSearchIndex {
  const groupBy = options.groupBy ?? ((record: SearchRecord) => record.route);
  const pageRank = options.pageRank ?? defaultPageRank;
  const synonyms = new Map<string, string[]>();
  for (const group of options.synonyms ?? []) {
    const terms = [...new Set(group.map(entry => words(entry).join('')).filter(Boolean))];
    for (const term of terms) {
      synonyms.set(term, [
        ...new Set([...(synonyms.get(term) ?? []), ...terms.filter(other => other !== term)])
      ]);
    }
  }

  const miniSearch = new MiniSearch<{ id: number } & Record<Field, string>>({
    fields: [...FIELDS],
    storeFields: []
  });
  miniSearch.addAll(
    records.map((record, id) => ({
      id,
      title: record.title,
      compactTitle: words(record.title).join(''),
      keywords: joinField(record.fields?.keywords),
      headings: record.headings.join(' '),
      description: joinField(record.fields?.description),
      text: record.text
    }))
  );

  const toHit = (record: SearchRecord, terms: string[]): SearchHit => ({
    id: record.id,
    route: record.route,
    ...(record.anchor ? { anchor: record.anchor } : {}),
    href: record.anchor ? `${record.route}#${record.anchor}` : record.route,
    title: record.title,
    headings: record.headings,
    namespace: record.namespace,
    snippet: snippet(record.text || joinField(record.fields?.description), terms),
    terms
  });

  function search(query: string, searchOptions: SearchOptions = {}): SearchResult[] {
    const { namespace, namespaces, filter, limit = 10, sectionsPerResult = 3 } = searchOptions;
    const queryTerms = [...new Set(words(query))];
    if (queryTerms.length === 0) {
      return [];
    }
    const meaningful = queryTerms.filter(term => !STOP_WORDS.has(term));
    const searchTerms = meaningful.length > 0 ? meaningful : queryTerms;
    const queryWords: QueryWord[] = searchTerms.map((word, i) => {
      const forms = withPlurals(word);
      const synonymForms = forms
        .flatMap(form => synonyms.get(form) ?? [])
        .flatMap(withPlurals)
        .filter(form => !forms.includes(form));
      return {
        word,
        forms,
        synonyms: [...new Set(synonymForms)],
        prefix: i === searchTerms.length - 1,
        edits: allowedEdits(word)
      };
    });
    // "date picker" finds "Datepicker", and "datepicker" finds "Date picker".
    const compactQuery = searchTerms.length > 1 ? searchTerms.join('') : undefined;

    const termOptions = new Map<string, { prefix: boolean; fuzzy: number | false }>();
    for (const queryWord of queryWords) {
      termOptions.set(queryWord.word, {
        prefix: queryWord.prefix,
        fuzzy: queryWord.edits || false
      });
    }
    for (const queryWord of queryWords) {
      for (const alternative of [...queryWord.forms, ...queryWord.synonyms]) {
        if (!termOptions.has(alternative)) {
          termOptions.set(alternative, { prefix: false, fuzzy: false });
        }
      }
    }

    const hits = miniSearch.search(
      {
        combineWith: 'OR',
        queries: [
          ...termOptions.keys(),
          ...(compactQuery
            ? [{ queries: [compactQuery], fields: ['compactTitle'], prefix: true, fuzzy: false }]
            : [])
        ]
      },
      {
        boost: BOOST,
        prefix: term => termOptions.get(term)?.prefix ?? false,
        fuzzy: term => termOptions.get(term)?.fuzzy ?? false,
        filter: ({ id }) => {
          const record = records[id];
          return (
            (!namespaces || namespaces.includes(record.namespace)) && (!filter || filter(record))
          );
        }
      }
    );

    const ranked = hits.slice(0, MAX_CANDIDATES).map(hit => {
      const record = records[hit.id];
      const wordMatches = matchWords(queryWords, hit);
      const matches = wordMatches.map(({ best }) => best);
      const compactMatch =
        compactQuery !== undefined &&
        Object.entries(hit.match).some(
          ([term, fields]) => fields.includes('compactTitle') && term.startsWith(compactQuery)
        );
      const wordsMatched = compactMatch ? queryWords.length : matches.filter(Boolean).length;
      const count = (kind: MatchKind) =>
        compactMatch ? 0 : matches.filter(match => match?.kind === kind).length;
      const attribute = compactMatch
        ? 0
        : matches.reduce((sum, match) => sum + (match?.rank ?? UNMATCHED_RANK), 0);
      // Exact when the text is the query as the reader meant it: with any typos,
      // plurals or synonyms swapped for the words they matched, and spaces ignored.
      const spellings = wordMatches.map(match => match.spellings);
      const isExact = (text: string) => {
        const key = comparable(words(text));
        return key !== '' && spells(key, spellings);
      };
      const titleExact = isExact(record.title);
      const lastHeading = record.headings[record.headings.length - 1];
      // Only between pages whose title doesn't match: a "Button" section of the
      // Button page shouldn't beat the page itself.
      const headingExact = titleExact || (lastHeading !== undefined && isExact(lastHeading));
      return {
        record,
        terms: highlightTerms(record, hit),
        wordsMatched,
        key: [
          -wordsMatched,
          titleExact ? 0 : 1,
          namespace === undefined || record.namespace === namespace ? 0 : 1,
          count('typo'),
          count('synonym'),
          attribute,
          headingExact ? 0 : 1,
          pageRank(record),
          record.headings.length,
          -hit.score
        ]
      };
    });

    const mostWordsMatched = Math.max(0, ...ranked.map(hit => hit.wordsMatched));
    const best = ranked
      .filter(hit => hit.wordsMatched === mostWordsMatched && hit.wordsMatched > 0)
      .sort((a, b) => compareKeys(a.key, b.key));

    const results: SearchResult[] = [];
    const byGroup = new Map<string, SearchResult>();
    for (const { record, terms } of best) {
      const group = groupBy(record);
      const result = byGroup.get(group);
      if (result) {
        if (result.sections.length < sectionsPerResult) {
          result.sections.push(toHit(record, terms));
        }
      } else if (results.length < limit) {
        const created: SearchResult = { ...toHit(record, terms), group, sections: [] };
        byGroup.set(group, created);
        results.push(created);
      }
    }
    return results;
  }

  return {
    search,
    get size() {
      return records.length;
    }
  };
}
