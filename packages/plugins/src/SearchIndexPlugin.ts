import { unified } from 'unified';
import markdown from 'remark-parse';
import remarkMdx from 'remark-mdx';
import { visit } from 'unist-util-visit';
import type { Node } from 'unist';
import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';

type LeafNode = Node & {
  value: string;
};

interface IndexItem {
  title: string;
  route: string;
  content?: string[];
  [key: string]: string | string[];
}

interface SearchRelevancy {
  includeScore?: boolean;
  includeMatches?: boolean;
  maxPatternLength?: number;
  ignoreLocation?: boolean;
  threshold?: number;
  keys?: string[] | { name: string; weight: number }[];
}
interface SearchIndexPluginOptions {
  maxLineLength?: number;
  maxLineCount?: number;
  keys?: string[];
  relevancy?: SearchRelevancy;
}

interface Optimization {
  content: string;
  title: string;
  maxLineCount?: number;
  maxLineLength?: number;
}

const defaultRelevancyOptions = {
  includeScore: true,
  includeMatches: true,
  maxPatternLength: 240,
  ignoreLocation: true,
  threshold: 0.3
};

/**
 * We need these keys to *always* be included in the search index.
 * Without the title, there would be no way to display the search results.
 * Without the route, there would be no way to navigate to the page.
 */
const requiredKeys = ['title', 'route'];

/**
 * If there are no keys specified in the plugin options, we'll use these
 */
const fallbackKeys = [...requiredKeys, 'content'];

/**
 * There are three scenarios for the "keys":
 *
 * 1. No keys are specified in the plugin options. In this case, we'll use the fallback keys.
 * 2. The keys are specified as an array of strings. In this case, we'll add the required keys to the array.
 * 3. The keys are specified as an array of objects. In this case, we can assume "weighting" is being applied
 *    so we'll only return the keys that have been specified in the options.
 *
 * @param optionKeys array of keys specified in the plugin options
 * @returns array of keys to be used in the search index
 */
export function parseKeys(optionKeys = []) {
  if (optionKeys.length < 1) return fallbackKeys;
  if (typeof optionKeys[0] === 'string') return [...requiredKeys, ...optionKeys];
  return optionKeys;
}

/**
 * Converts raw content string into an array of sentences suitable for inclusion
 * in the search index
 *
 * @param options.content the raw content string
 * @param options.title the title of the page  (used for adding context to parse errors)
 * @param options.maxLineLength the maximum length of a sentence (set this to match the
 * "location" option in your Fuse.js configuration). Sentences longer than this value will be
 * truncated.
 * @param options.maxLineCount the maximum number of lines to include in the search index for
 * each page. Pages with more lines than this value will be truncated.
 * @returns array of sentence strings
 */
export const optimizeContentForSearch = async ({
  content: rawContent,
  title,
  maxLineLength,
  maxLineCount
}: Optimization) => {
  const content = (rawContent ?? '').replaceAll('\r', '');
  if (!content || content.length < 1) return [content];
  const processor = unified().use(markdown).use(remarkMdx);
  let tree;

  try {
    tree = await processor.parse(content);
  } catch (err) {
    console.error(`Search Index Plugin failed to parse content for ${title}`, err.reason);
    return [];
  }

  const sentences: string[] = [];

  const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });

  visit(
    tree,
    (node: Node) => node.type === 'text' || node.type === 'code',
    (node: LeafNode) => {
      const segments = [...segmenter.segment(node.value)].map(segment => segment.segment);
      segments.forEach(segment => {
        if (maxLineLength) {
          sentences.push(segment.slice(0, maxLineLength));
        } else {
          sentences.push(segment);
        }
      });
    }
  );

  if (maxLineCount) {
    return sentences.slice(0, maxLineCount);
  }
  return sentences;
};

/**
 * Creates a search-data.json file that contains all the information
 * from each page that is required to generate a search index.
 */
const SearchIndexPlugin: PluginType<Page, SearchIndexPluginOptions> = {
  /**
   * For each source, parse the data we want to add to the search index and
   * save it to the global config (to be saved to the filesystem later when
   * all sources have been loaded).
   */
  async $beforeSend(
    mutableFilesystem,
    { config, serialiser, ignorePages },
    { maxLineLength, maxLineCount, keys: optionKeys }
  ) {
    const pages = await Promise.all(
      (
        (await mutableFilesystem.promises.glob('**', {
          onlyFiles: true,
          ignore: ignorePages.map(ignore => `**/${ignore}`),
          cwd: '/'
        })) as string[]
      ).map(async pagePath => {
        const deserialisedPage = await serialiser.deserialise(
          pagePath,
          await mutableFilesystem.promises.readFile(pagePath)
        );
        return deserialisedPage;
      })
    );
    const searchData = await Promise.all(
      pages.map(async page => {
        const content = await optimizeContentForSearch({
          content: page.content || '',
          title: page.title || '',
          maxLineLength,
          maxLineCount
        });
        const keys = parseKeys(optionKeys);
        /**
         * If the "content" key is specified, we want to include the result of
         * the optimizeContentForSearch() function. Otherwise, we include the
         * key value directly from the page data.
         */
        return keys.reduce(
          (acc, key) => ({ ...acc, [key]: key === 'content' ? content : page[key] }),
          {}
        );
      })
    );
    /**
     * Convert the searchData into an object where each page has a unique key (the
     * route) so that the "merge" in `config.setData()` will correctly combine all
     * the results from multiple sources.
     */
    const searchDataKeyedByRoute = searchData.reduce(
      (acc, curr: IndexItem) => ({
        ...acc,
        [curr.route]: curr
      }),
      {}
    );
    config.setData({
      searchIndices: searchDataKeyedByRoute
    });
  },
  /**
   * Once we have all the sources' search data added to `globalConfig`, convert it
   * to JSON and save it to the filesystem.
   */
  async afterUpdate(_, { sharedFilesystem, globalConfig }, { keys: optionKeys, relevancy }) {
    if (!globalConfig.data.searchIndices) return;
    const globalSearchIndices = globalConfig.data.searchIndices;
    const searchData = Object.values(globalSearchIndices);
    const condensedSearchData = searchData.map(page => ({ title: page.title, route: page.route }));
    const keys = parseKeys(optionKeys);
    const searchConfig = {
      ...defaultRelevancyOptions,
      ...relevancy,
      keys
    };
    await sharedFilesystem.promises.writeFile('/search-config.json', JSON.stringify(searchConfig));
    await sharedFilesystem.promises.writeFile('/search-data.json', JSON.stringify(searchData));
    await sharedFilesystem.promises.writeFile(
      '/search-data-condensed.json',
      JSON.stringify(condensedSearchData)
    );
  }
};

export default SearchIndexPlugin;
