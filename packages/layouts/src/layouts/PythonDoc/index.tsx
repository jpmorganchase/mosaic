import React from 'react';
import classnames from 'clsx';
import { HelpLinks, Hero } from '@jpmorganchase/mosaic-components';
import {
  AppHeader,
  BackLink,
  Breadcrumbs,
  DocPaginator,
  Footer,
  TableOfContents,
  PageNavigation
} from '@jpmorganchase/mosaic-site-components';

import { LayoutBase } from '../../LayoutBase';
import { LayoutColumns } from '../../LayoutColumns';
import type { LayoutProps } from '../../types';
import styles from './styles.css';

// TODO add image support to Hero via Mosaic plugin or provide a custom Layout
const APIHero = ({ description, name, pageType, releaseDate, title, version }) => (
  <Hero
    datestamp={releaseDate}
    datestampLabel="Release Date"
    description={description}
    eyebrow={pageType === 'root' ? `Version ${version}` : `${name} - v${version}`}
    title={pageType === 'root' ? name : title}
  />
);

export const PythonDoc: React.FC<LayoutProps> = ({
  BackLinkProps,
  FooterProps,
  SidebarProps,
  ToCProps,
  children,
  meta
}) => {
  // Format the toc so that function calls do not have any arguments
  // init(arg1, arg2) becomes init()
  const formattedTableOfContentsItems = ToCProps?.items?.map(({ text, ...rest }) => ({
    ...rest,
    text: text.replace(/\s*\(.*?\).*/g, '() ')
  }));

  const PrimarySidebar = (
    <>
      {BackLinkProps && (
        <header className={styles.sidebarHeader}>
          <BackLink {...BackLinkProps} />
        </header>
      )}
      <PageNavigation />
      {SidebarProps?.helpLinks && <HelpLinks subTitle="Need help?" {...SidebarProps.helpLinks} />}
    </>
  );

  const SecondarySidebar = <TableOfContents items={formattedTableOfContentsItems} />;

  return (
    <LayoutBase Header={<AppHeader />}>
      <LayoutColumns
        PrimarySidebar={PrimarySidebar}
        SecondarySidebar={SecondarySidebar}
        Footer={<Footer {...FooterProps} />}
      >
        <main className={classnames(styles.contentBody, 'pythondoc')}>
          <Breadcrumbs />
          {meta?.data?.pageType === 'root' || meta?.data?.pageType === 'index' ? (
            <APIHero
              description={
                meta.data.api?.description ? `Changelog: ${meta.data.api.description}` : undefined
              }
              name={meta.data.api?.name}
              pageType={meta.data.pageType}
              releaseDate={meta.data.api?.releaseDate}
              title={meta.data.title}
              version={meta.data.api?.version}
            />
          ) : null}
          {children}
          <DocPaginator />
        </main>
      </LayoutColumns>
    </LayoutBase>
  );
};
