import React, { useEffect, useRef, useState } from 'react';
import { Spinner } from '@salt-ds/core';
import { useToolbarState, ToolbarProvider } from '@jpmorganchase/mosaic-components';

import drawTree from './drawTree';
import styles from './styles.css';
import { SitemapToolbar } from './SitemapToolbar';

import { groupBy } from 'lodash-es';

export interface SitemapTreeProps {
  d3: any;
  /** Additional class name for overrides */
  className?: string;
  /** The url of the file system, defaults to '/sitemap.xml' */
  href: string;
  /** Initial namespace filters */
  initialNamespaceFilters?: string[];
}

type SitemapNode = {
  /** Node id */
  id: string;
  /** Parent node id */
  parent: string | undefined;
  /** Node label */
  label: string;
  /** Page link */
  link: string;
  /** Node children */
  children: SitemapNode[];
};

const hiddenFileFilter = (pagePath: string) => /\/[^.]*$/.test(pagePath);
const createNamespaceFilter =
  (filters: string[] = []) =>
  (route: string) => {
    if (!filters || !filters.length) {
      return true;
    }
    const namespaceRegexp = new RegExp(/\/([^/]*)/);
    const namespaceMatches = route.match(namespaceRegexp);
    if (!namespaceMatches) {
      return false;
    }
    return namespaceMatches ? filters.indexOf(namespaceMatches[1]) !== -1 : false;
  };

const filterRoutes = (routes: string[], namespaceFilters: string[]) => {
  const namespaceFilter = createNamespaceFilter(namespaceFilters);
  const customFilter = (pagePath: string) =>
    hiddenFileFilter(pagePath) && namespaceFilter(pagePath);
  return routes.filter(customFilter);
};

function getAllNamespaces(routes): string[] {
  const isRootNamespaceRegexp = new RegExp(/^\/[^\/]+\/index$/);
  return routes.reduce((allNamespaces, route) => {
    const namespace = route.match(/^\/([^\/]+)\//)[1];
    if (isRootNamespaceRegexp.test(route) && allNamespaces.indexOf(namespace) === -1) {
      allNamespaces = [...allNamespaces, namespace];
    }
    return allNamespaces;
  }, []);
}

export const Sitemap: React.FC<SitemapTreeProps> = ({
  d3,
  href = '/sitemap.xml',
  initialNamespaceFilters = [],
  ...rest
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<string[]>();
  const [loading, setLoading] = useState<boolean>(true);
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const { filters = [] } = useToolbarState();

  const drawSitemap = (routes: string[]) => {
    if (!containerRef?.current) {
      return;
    }
    d3.select(containerRef.current).html('');
    d3.select(containerRef.current).append(() =>
      drawTree(d3, createSitemap(routes), {
        width: 1152
      }).node()
    );
  };

  const createSitemap = fileSystem => {
    const groupedByParentRoutes = groupBy(fileSystem, route => {
      const dirnameRegexp = new RegExp(/\/[^/]*$/);
      return route.replace(dirnameRegexp, '');
    });
    function createSitemapNode(route) {
      const basenameRegexp = new RegExp(/.*\//);
      const isNamespaceRegexp = new RegExp(/^\/[^\/]+\/?$/);
      const childPathRegexp = new RegExp(/\/[^\/]+\/?$/);
      const label = route.replace(basenameRegexp, '');
      let parent = isNamespaceRegexp.test(route) ? '/' : route.replace(childPathRegexp, '');
      return { id: route, parent, label, link: route };
    }
    const treeData = Object.keys(groupedByParentRoutes).reduce(
      (result, parentRoute) => {
        const children = groupedByParentRoutes[parentRoute];
        const childNodes = children.reduce((childrenResult, childRoute) => {
          const isIndexPageRegexp = new RegExp(/\/index$/);
          // Ignore index pages within directories as the parent node will link to the default page
          if (isIndexPageRegexp.test(childRoute)) {
            return childrenResult;
          }
          return [...childrenResult, createSitemapNode(childRoute)];
        }, []);
        return [...result, createSitemapNode(parentRoute), ...childNodes];
      },

      [{ id: '/', parent: undefined, label: 'root', link: '/' }]
    );
    return d3
      .stratify()
      .id((node: SitemapNode) => node.id)
      .parentId((node: SitemapNode) => node.parent)(treeData);
  };

  useEffect(() => {
    if (!dataRef.current) {
      d3.xml(href)
        .then((xmlData: any) => {
          const routes: string[] = Array.from<Element>(xmlData.querySelectorAll('url loc')).map(
            node => {
              const textContent = node.textContent;
              if (textContent) {
                const { pathname } = new URL(textContent);
                return pathname;
              }
              return 'unknown';
            }
          );
          setLoading(false);
          dataRef.current = routes;
          setNamespaces(getAllNamespaces(routes));
          return routes;
        })
        .finally(() => {
          if (dataRef.current) {
            const filteredRoutes = filterRoutes(dataRef.current, filters);
            drawSitemap(filteredRoutes);
            setPageCount(filteredRoutes.length + namespaces.length);
          }
        });
    } else {
      const filteredRoutes = filterRoutes(dataRef.current, filters);
      drawSitemap(filteredRoutes);
      const newPageCount = filters.length
        ? filteredRoutes.length + filters.length
        : filteredRoutes.length + namespaces.length;
      setPageCount(newPageCount);
    }
  }, [href, filters]);

  return (
    <div {...rest}>
      <SitemapToolbar loading={loading} pageCount={pageCount} namespaces={namespaces} />
      <div className={styles.loading}>
        {loading ? (
          <>
            <Spinner size="large" />
            Loading View
          </>
        ) : null}
      </div>
      <div ref={containerRef} />
    </div>
  );
};

export const SitemapTree: React.FC<SitemapTreeProps> = ({
  initialNamespaceFilters = [],
  ...props
}) => {
  return (
    <ToolbarProvider initialState={{ filters: initialNamespaceFilters }}>
      <Sitemap {...props} />
    </ToolbarProvider>
  );
};
