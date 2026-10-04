import path from 'node:path';
import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import { remark } from 'remark';
import remarkMdx from 'remark-mdx';
import checkLinks from 'check-links';
import { visit } from 'unist-util-visit';
import proxyAgentPkg from 'https-proxy-agent';

const { HttpsProxyAgent } = proxyAgentPkg;

async function checkPageLinks(
  ast: unknown,
  options: BrokenLinksPluginOptions,
  fullPath: string,
  headings
) {
  const urlToNodes = {};

  const aggregate = node => {
    const { url: urlFromNode } = node;
    if (!urlFromNode) return;

    const isExternalUrl = /^(https?:\/\/)/.test(urlFromNode);

    const url = isExternalUrl
      ? // full urls including internal and external
        new URL(urlFromNode)
      : // handles relative links
        new URL(
          `${path.posix.resolve(path.posix.dirname(fullPath), urlFromNode)}`,
          options.baseUrl
        );

    if (!isExternalUrl && url.hash !== '') {
      const isValidHeadingLink =
        headings.findIndex(
          heading =>
            heading.replace(/\W+/g, '-').toLowerCase() === url.hash.substring(1).toLowerCase()
        ) !== -1;

      if (isValidHeadingLink) {
        // link points to a heading on the page
        return;
      }
    }

    if (
      options.skipUrlPatterns &&
      options.skipUrlPatterns.some(skipPattern => new RegExp(skipPattern).test(url.toString()))
    ) {
      return;
    }

    if (!urlToNodes[url.toString()]) {
      urlToNodes[url.toString()] = [];
    }

    urlToNodes[url.toString()].push(node);
  };

  visit(ast, ['link', 'image', 'definition'], aggregate);
  const links = Object.keys(urlToNodes);
  const checkLinksOptions = options.proxyEndpoint
    ? {
        agent: {
          https: new HttpsProxyAgent(options.proxyEndpoint)
        }
      }
    : {};

  const results = await checkLinks(links, checkLinksOptions);
  links.forEach(link => {
    const result = results[link];

    if (result.status !== 'dead' && result.status !== 'invalid') {
      return;
    }

    const nodes = urlToNodes[link];
    if (!nodes) return;

    console.group(`[Mosaic][Plugin-BrokenLinks] Broken links found in ${fullPath}`);
    for (const node of nodes) {
      console.log(`Link to ${link} is dead`, node);
    }
    console.groupEnd();
  });
}

async function findPageHeadings(ast) {
  const headings = [];
  visit(ast, ['heading'], node => {
    headings.push(node.children[0]?.value);
  });

  return headings;
}

const processor = remark().use(remarkMdx);

interface BrokenLinksPluginPage extends Page {}

interface BrokenLinksPluginOptions {
  baseUrl: string;
  skipUrlPatterns?: Array<string | RegExp>;
  proxyEndpoint?: string;
}

const PAGE_CHECK_CONCURRENCY = 4;

async function checkPage(
  { fullPath, content }: { fullPath: string; content: string },
  options: BrokenLinksPluginOptions
) {
  try {
    const ast = processor.parse(content);
    const headings = await findPageHeadings(ast);
    await checkPageLinks(ast, options, fullPath, headings);
  } catch (error) {
    console.warn(`[Mosaic][Plugin-BrokenLinks] Could not check the links in ${fullPath}`, error);
  }
}

async function checkPages(pages: BrokenLinksPluginPage[], options: BrokenLinksPluginOptions) {
  // Snapshot the content now, because later plugins may rewrite it.
  const queue = pages
    .filter(page => typeof page.content === 'string')
    .map(({ fullPath, content }) => ({ fullPath, content: content as string }));
  const worker = async () => {
    for (let page = queue.shift(); page; page = queue.shift()) {
      await checkPage(page, options);
    }
  };
  await Promise.all(Array.from({ length: Math.min(PAGE_CHECK_CONCURRENCY, queue.length) }, worker));
}

const BrokenLinksPlugin: PluginType<BrokenLinksPluginPage, BrokenLinksPluginOptions> = {
  async $afterSource(pages, _, options) {
    // Links between pages are checked over HTTP against the running Mosaic
    // server, so this runs in the background instead of holding up the source
    // update. `checkPages` handles its own errors.
    checkPages(pages, options);

    return pages;
  }
};

export default BrokenLinksPlugin;
