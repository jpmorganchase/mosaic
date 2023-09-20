import type { Page, Plugin as PluginType } from '@jpmorganchase/mosaic-types';
import { escapeRegExp } from 'lodash-es';
import path from 'path';
import proxyAgentPkg from 'https-proxy-agent';

import PluginError from './utils/PluginError.js';

const { HttpsProxyAgent } = proxyAgentPkg;

interface ComponentDescriptorPage extends Page {
  descriptor: { id: string; fragmentEndpoint: string };
  props: any;
  proxyEndpoint?: string;
  name: string;
}

interface ContentFragmentPropsPluginOptions {
  rootFolder: string;
}

function createPageTest(ignorePages, pageExtensions) {
  const extTest = new RegExp(`${pageExtensions.map(escapeRegExp).join('|')}$`);
  const ignoreTest = new RegExp(`${ignorePages.map(escapeRegExp).join('|')}$`);
  return file =>
    !ignoreTest.test(file) && extTest.test(file) && !path.basename(file).startsWith('.');
}

async function fetchFragmentProps(endpoint: string, proxyEndpoint: string, rootFolder: string) {
  const requestConfig = {
    agent: proxyEndpoint ? new HttpsProxyAgent(proxyEndpoint) : undefined,
    timeout: 5000,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const request = new Request(endpoint, requestConfig);
  const response = await fetch(request);
  const props = {};

  if (response.ok) {
    const data = await response.json();

    const { elementsOrder, elements } = data.properties;

    for (const elementName of elementsOrder) {
      const { value, dataType } = elements[elementName];

      if (
        String(dataType).toLowerCase() === 'content-fragment' &&
        value !== undefined &&
        // TODO: handle arrays
        !Array.isArray(value)
      ) {
        const [publicUrl] = endpoint.split(rootFolder);
        const [, childPath] = value.split(`${rootFolder}/`);

        const url = `${publicUrl}markets-client-portal/${childPath}.json`;
        props[elementName] = await fetchFragmentProps(url, proxyEndpoint, rootFolder);
        continue;
      }
      props[elementName] = value;
    }
  }

  return props;
}

const ContentFragmentPropsPlugin: PluginType<
  ComponentDescriptorPage,
  ContentFragmentPropsPluginOptions
> = {
  async $afterSource(pages, { ignorePages, pageExtensions }, options) {
    const isNonHiddenPage = createPageTest(ignorePages, pageExtensions);

    for (const page of pages) {
      try {
        if (!isNonHiddenPage(page.fullPath)) {
          continue;
        }

        const {
          descriptor: { fragmentEndpoint },
          proxyEndpoint
        } = page;
        const props = await fetchFragmentProps(fragmentEndpoint, proxyEndpoint, options.rootFolder);
        page.name = page.descriptor.id;
        page.props = props;
        delete page.descriptor;
      } catch (e) {
        throw new PluginError(e.message, page.fullPath);
      }
    }
    return pages;
  }
};

export default ContentFragmentPropsPlugin;
