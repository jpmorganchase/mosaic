/**
 * The search engine over `search-records.json`: Algolia-style ranking on a
 * small docs site with tabbed component pages, like salt-ds.
 */
import { describe, expect, test } from 'vitest';

import {
  createSearchIndex,
  highlight,
  snippet,
  type SearchIndexOptions,
  type SearchRecord
} from '../search/index.js';

interface PageSpec {
  description?: string;
  keywords?: string[];
  intro?: string;
  sections?: [heading: string, text: string][];
}

function page(route: string, title: string, spec: PageSpec = {}): SearchRecord[] {
  const namespace = route.split('/')[1];
  const fields = {
    ...(spec.description ? { description: spec.description } : {}),
    ...(spec.keywords ? { keywords: spec.keywords } : {})
  };
  return [
    {
      id: route,
      route,
      title,
      headings: [],
      text: spec.intro ?? '',
      namespace,
      ...(Object.keys(fields).length > 0 ? { fields } : {})
    },
    ...(spec.sections ?? []).map(([heading, text]) => {
      const anchor = heading.toLowerCase().replace(/\s+/g, '-');
      return {
        id: `${route}#${anchor}`,
        route,
        anchor,
        title,
        headings: [heading],
        text,
        namespace
      };
    })
  ];
}

const records: SearchRecord[] = [
  ...page('/salt/components/button/index', 'Button', {
    description: 'Buttons trigger an action.',
    keywords: ['cta']
  }),
  ...page('/salt/components/button/usage', 'Button', {
    sections: [
      ['Button', 'Use a button for the main action. Every button has a label.'],
      ['When to use', 'Use a button to submit a form or open a dialog.']
    ]
  }),
  ...page('/salt/components/button/examples', 'Button', {
    sections: [
      ['Disabled', 'Disable a button when its action is unavailable.'],
      ['Icon only', 'Show only an icon when space is tight.']
    ]
  }),
  ...page('/salt/components/toggle-button/index', 'Toggle button', {
    description: 'A button that can be on or off.'
  }),
  ...page('/salt/components/dropdown/index', 'Dropdown', {
    description: 'Select one option from a list.'
  }),
  ...page('/salt/components/combo-box/index', 'Combo box', {
    description: 'Type to filter a list of options.'
  }),
  ...page('/salt/patterns/forms', 'Forms', {
    sections: [['Choosing a field', 'A dropdown suits short lists.']]
  }),
  ...page('/salt/patterns/filtering', 'Filtering', {
    // Scores higher for "combobox" than the forms page does for "dropdown".
    sections: [['Typeahead', 'A combobox filters as you type in the combobox.']]
  }),
  ...page('/salt/components/date-picker/index', 'Date picker', {
    description: 'Pick a date from a calendar.'
  }),
  ...page('/salt/components/tabs/index', 'Tabs', {
    description: 'Switch between views.'
  }),
  ...page('/salt/components/table/index', 'Table', {
    description: 'Show data in rows and columns.'
  }),
  ...page('/salt/foundations/color', 'Colors', {
    intro: 'Our palette for every theme.',
    sections: [['Accent', 'Accent colours draw attention to a button.']]
  }),
  ...page('/salt/foundations/density', 'Density', {
    intro: 'Density changes the size of components.'
  }),
  ...page('/salt/components/provider/examples', 'Provider', {
    sections: [['Density', 'Set the density for an application.']]
  }),
  ...page('/mosaic/configure/index', 'Configure', {
    intro: 'Configure the content pipeline.',
    sections: [['Plugins', 'Plugins change pages as they are loaded.']]
  }),
  ...page('/mosaic/components/button', 'Button', {
    description: 'The Mosaic site button.'
  })
];

const tabs = /\/(index|usage|examples)$/;
const options: SearchIndexOptions = {
  groupBy: record => record.route.replace(tabs, ''),
  pageRank: record => (/\/index$/.test(record.route) ? 0 : /\/usage$/.test(record.route) ? 1 : 2),
  synonyms: [['dropdown', 'combobox']]
};
const index = createSearchIndex(records, options);
const hrefs = (query: string, searchOptions = {}) =>
  index.search(query, { namespace: 'salt', ...searchOptions }).map(result => result.href);

describe('createSearchIndex', () => {
  test('counts the records', () => {
    expect(index.size).toBe(records.length);
  });

  test('returns nothing for an empty query', () => {
    expect(index.search('')).toEqual([]);
    expect(index.search('  !? ')).toEqual([]);
  });

  test('ranks the page whose title is the query first, as its introduction', () => {
    const [first] = index.search('button', { namespace: 'salt' });
    expect(first.href).toBe('/salt/components/button/index');
    expect(first.group).toBe('/salt/components/button');
  });

  test("doesn't let a section named like its page beat the page", () => {
    expect(hrefs('button')[0]).not.toBe('/salt/components/button/usage#button');
  });

  test('shows one result per group, with its other matching sections', () => {
    const [first] = index.search('button', { namespace: 'salt', sectionsPerResult: 2 });
    expect(first.sections.map(section => section.href)).toHaveLength(2);
    expect(hrefs('button').filter(href => href.startsWith('/salt/components/button/'))).toEqual([
      '/salt/components/button/index'
    ]);
  });

  test('tolerates typos, and finds prefixes of the last word', () => {
    expect(hrefs('buton')[0]).toBe('/salt/components/button/index');
    expect(hrefs('butt')[0]).toBe('/salt/components/button/index');
  });

  test('ignores plurals', () => {
    expect(hrefs('tab')[0]).toBe('/salt/components/tabs/index');
    expect(hrefs('color')[0]).toBe('/salt/foundations/color');
  });

  test('ignores spaces in titles', () => {
    expect(hrefs('datepicker')[0]).toBe('/salt/components/date-picker/index');
    expect(hrefs('combo box')[0]).toBe('/salt/components/combo-box/index');
  });

  test('returns terms that highlight a title matched without its spaces', () => {
    const [hit] = index.search('datepiker');
    expect(hit.href).toBe('/salt/components/date-picker/index');
    expect(highlight(hit.title, hit.terms)).toEqual([
      { text: 'Date', match: true },
      { text: ' ', match: false },
      { text: 'picker', match: true }
    ]);
  });

  test('finds synonyms, below the word itself', () => {
    expect(hrefs('dropdown')).toEqual([
      '/salt/components/dropdown/index',
      '/salt/components/combo-box/index',
      '/salt/patterns/forms#choosing-a-field',
      '/salt/patterns/filtering#typeahead'
    ]);
  });

  test('searches keywords', () => {
    expect(hrefs('cta')).toEqual(['/salt/components/button/index']);
  });

  test('only returns results that match the most query words', () => {
    expect(hrefs('button disabled')).toEqual(['/salt/components/button/examples#disabled']);
  });

  test('ignores stop words', () => {
    expect(hrefs('how to configure')[0]).toBe('/mosaic/configure/index');
  });

  test('ranks a page whose title is the query above a section with that heading', () => {
    expect(hrefs('density')).toEqual([
      '/salt/foundations/density',
      '/salt/components/provider/examples#density'
    ]);
  });

  test('ranks the current namespace first among equally good results', () => {
    expect(hrefs('button', { namespace: 'mosaic' })[0]).toBe('/mosaic/components/button');
    expect(hrefs('button', { namespace: 'salt' })[0]).toBe('/salt/components/button/index');
  });

  test('filters by namespace and by record', () => {
    expect(hrefs('plugins', { namespaces: ['salt'] })).toEqual([]);
    expect(hrefs('plugins', { namespaces: ['mosaic'] })).toEqual([
      '/mosaic/configure/index#plugins'
    ]);
    expect(
      hrefs('button', { filter: (record: SearchRecord) => !record.route.includes('/salt/') })
    ).toEqual(['/mosaic/components/button']);
  });

  test('limits the results', () => {
    expect(hrefs('button', { limit: 2 })).toHaveLength(2);
  });

  test('returns a snippet and the matched terms', () => {
    const [hit] = index.search('dialog');
    expect(hit).toMatchObject({
      href: '/salt/components/button/usage#when-to-use',
      title: 'Button',
      headings: ['When to use'],
      snippet: 'Use a button to submit a form or open a dialog.',
      terms: ['dialog']
    });
    expect(index.search('trigger')[0].snippet).toBe('Buttons trigger an action.');
  });

  test('defaults to one result per page, and index pages first', () => {
    const plain = createSearchIndex(records);
    const results = plain.search('button', { namespace: 'salt' });
    expect(results[0].href).toBe('/salt/components/button/index');
    expect(results.map(result => result.group)).toContain('/salt/components/button/usage');
  });
});

describe('highlight', () => {
  test('splits text into matching and other parts', () => {
    expect(highlight('A Button, buttons and button.', ['button'])).toEqual([
      { text: 'A ', match: false },
      { text: 'Button', match: true },
      { text: ', buttons and ', match: false },
      { text: 'button', match: true },
      { text: '.', match: false }
    ]);
  });

  test('treats terms as text, not patterns', () => {
    expect(highlight('Use $ref (a.b)', ['$ref', 'a.b'])).toEqual([
      { text: 'Use ', match: false },
      { text: '$ref', match: true },
      { text: ' (', match: false },
      { text: 'a.b', match: true },
      { text: ')', match: false }
    ]);
  });

  test('returns the text when nothing matches', () => {
    expect(highlight('Plain', [])).toEqual([{ text: 'Plain', match: false }]);
    expect(highlight('', ['x'])).toEqual([]);
  });
});

describe('snippet', () => {
  const text = `${'Lorem ipsum dolor sit amet. '.repeat(
    10
  )}The needle is here. ${'Consectetur adipiscing elit. '.repeat(10)}`;

  test('keeps short text whole', () => {
    expect(snippet('Short text', ['text'])).toBe('Short text');
  });

  test('cuts long text around the first match, at word boundaries', () => {
    const result = snippet(text, ['needle'], 80);
    expect(result).toMatch(/^….*needle.*…$/);
    const body = result.slice(1, -1);
    const start = text.indexOf(body);
    expect(start).toBeGreaterThan(0);
    expect(body.length).toBeLessThanOrEqual(80);
    expect(text[start - 1]).toBe(' ');
    expect(text[start + body.length]).toBe(' ');
  });

  test('starts at the beginning when nothing matches', () => {
    expect(snippet(text, ['missing'], 40)).toMatch(/^Lorem ipsum.*…$/);
  });
});
