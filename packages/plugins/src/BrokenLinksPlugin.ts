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

const BrokenLinksPlugin: PluginType<BrokenLinksPluginPage, BrokenLinksPluginOptions> = {
  async $afterSource(pages, _, options) {
    pages.forEach(async page => {
      const ast = await processor.parse(page.content);
      const headings = await findPageHeadings(ast);
      await checkPageLinks(ast, options, page.fullPath, headings);
    });

    return pages;
  }
};

export default BrokenLinksPlugin;
