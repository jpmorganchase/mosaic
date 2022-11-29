import React, { RefObject, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Dropdown, DropdownButton, Spinner } from '@jpmorganchase/uitk-lab';
import warning from 'warning';
import { Icon } from '../../Icon';

import { drawTree } from './drawTree';
import styles from './styles.css';
import { Caption2 } from '../../Typography';

let warnOnce: boolean;

export interface SitemapProps {
  /** Additional class name for overrides */
  className?: string;
  /** The url of the file system */
  href: string;
  /** Initial namespace filters */
  initialNamespaceFilters?: string[];
}

const filterPaths = (slugs: string[], namespaceFilters: string[]) => {
  const namespaceFilter = (pagePath: string) => {
    if (!namespaceFilters.length) {
      return true;
    }
    const pageNamespaceMatches = pagePath.match(/\/([^/]*)/);
    if (!pageNamespaceMatches) {
      return false;
    }
    const pageNamespace = pageNamespaceMatches[1];
    return namespaceFilters.indexOf(pageNamespace) !== -1;
  };
  const customFilter = (pagePath: string) =>
    dottedFileFilter(pagePath) && namespaceFilter(pagePath);
  const filteredPaths = slugs.filter(customFilter);
  return filteredPaths;
};

const drawSitemap = (filteredPaths: string[], containerRef: RefObject<HTMLDivElement>) => {
  if (!containerRef?.current) {
    throw new Error('no container ref defined for sitemap');
  }

  d3.select(containerRef.current).html('');
  d3.select(containerRef.current).append(() =>
    drawTree(parseFileSystem(filteredPaths), {
      label: node => node.name.substring(node.name.lastIndexOf('/') + 1),
      link: node => node.link,
      width: 1152
    }).node()
  );
};

type FileSystemBase = {
  name: string;
  parent: string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
};

interface FileSystemItem extends FileSystemBase {
  children: FileSystemItem[];
}

const parseFileSystem = (fileSystem: any) => {
  // We create an node in the hieracy for entry in the file-system
  // hierachyData is of the form
  // [...{ name: <node name>, parent: <node name>, { data: <node data object> }]
  const hierachyData = fileSystem.reduce(
    (result: FileSystemBase[], path: string) => {
      const pathParts = path.split('/');
      const flattenedPaths = pathParts.reduce<FileSystemBase[]>(
        (partsResults, _path: string, pathIndex: number) => {
          if (pathIndex === 0) {
            return partsResults;
          }
          const name = pathParts.slice(0, pathIndex + 1).join('/');
          const isIndex = /\/index$/.test(name);
          // Ignore indexes, as the node is represented by the directory
          // Ignore duplicates
          if (
            isIndex ||
            result.some((existingItem: FileSystemBase) => existingItem.name === name)
          ) {
            return partsResults;
          }
          let parent;
          // If a namespace then parent is root
          if (pathIndex <= 1) {
            parent = '/';
          } else {
            parent = name.substring(0, name.lastIndexOf('/'));
          }
          // Add node specific data as required to
          // { ... data: { <node data> } }
          return [...partsResults, { name, parent, data: { name, link: path } }];
        },
        []
      );
      return [...result, ...flattenedPaths];
    },
    [{ name: '/', parent: undefined, data: { name: 'root', link: '/' } }]
  );
  return d3
    .stratify()
    .id((data: FileSystemItem) => data.name)
    .parentId((data: FileSystemItem) => data.parent)(hierachyData);
};

const dottedFileFilter = (pagePath: string) => /\/[^.]*$/.test(pagePath);

const filterButtonLabel = (selectedItems: string[] | undefined) => {
  if (!selectedItems || selectedItems.length === 0) {
    return 'All';
  }
  if (selectedItems.length === 1) {
    return selectedItems[0];
  }
  return `${selectedItems.length} Items Selected`;
};

const DropdownIcon = () => <Icon name="chevronDown" />;

export const Sitemap: React.FC<SitemapProps> = ({
  href,
  initialNamespaceFilters = [],
  ...rest
}: SitemapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<string[]>();
  const [loading, setLoading] = useState<boolean>(true);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [namespaceFilters, setNamespaceFilters] = useState<string[]>(initialNamespaceFilters);
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    warning(
      warnOnce,
      'Sitemap component is an alpha Lab component and is not ready for Production use'
    );
    warnOnce = true;

    if (!dataRef.current) {
      d3.json(href)
        .then((siteJSON: any) => {
          const { slugs } = siteJSON;
          setLoading(false);
          const loadedNamespaces: string[] = slugs.reduce<string[]>((namespaceResult, pagePath) => {
            const pageNamespaceMatches = pagePath.match(/\/([^/]*)/);
            if (!pageNamespaceMatches) {
              return namespaceResult;
            }
            const pageNamespace: string = pageNamespaceMatches[1];
            if (namespaceResult.indexOf(pageNamespace) === -1) {
              namespaceResult.push(pageNamespace);
            }
            return namespaceResult;
          }, []);
          dataRef.current = slugs;
          setNamespaces(loadedNamespaces);
          return slugs;
        })
        .finally(() => {
          if (dataRef.current) {
            const filteredPaths = filterPaths(dataRef.current, namespaceFilters);
            drawSitemap(filteredPaths, containerRef);
            setPageCount(filteredPaths.length);
          }
        })
        .catch((loadingError: Error) => {
          console.error(loadingError);
          setLoading(false);
          setError(loadingError.message);
        });
    } else {
      const filteredPaths = filterPaths(dataRef.current, namespaceFilters);
      drawSitemap(filteredPaths, containerRef);
      setPageCount(filteredPaths.length);
    }
  }, [href, namespaceFilters]);

  const handleSelect = (_event: Event, selectedItems: string[]) => {
    setNamespaceFilters(selectedItems);
  };

  return (
    <div {...rest}>
      <div className={styles.toolbar}>
        {!loading ? (
          <>
            <Caption2 className={styles.pageCount}>Number of pages: {pageCount}</Caption2>
            <Dropdown
              triggerComponent={
                <DropdownButton
                  IconComponent={DropdownIcon}
                  label={filterButtonLabel(namespaceFilters)}
                />
              }
              width={200}
              onOpenChange={setIsOpen}
              onSelectionChange={handleSelect}
              selectionStrategy="multiple"
              source={namespaces}
            />
          </>
        ) : null}
      </div>
      <div className={styles.feedback}>
        {!error && loading ? (
          <>
            <Spinner size="large" />
            Loading Map
          </>
        ) : null}
        {error ? <>An error occurred: {error}</> : null}
      </div>
      {!loading && !error ? <div ref={containerRef} /> : null}
    </div>
  );
};
