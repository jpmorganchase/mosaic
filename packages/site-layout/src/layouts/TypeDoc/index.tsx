import React from 'react';
import classnames from 'classnames';
import { HelpLinks, Hero } from '@jpmorganchase/mosaic-components';
import {
  AppHeader,
  BackLink,
  Breadcrumbs,
  Footer,
  VerticalNavigation
} from '@jpmorganchase/mosaic-site-components';

import { LayoutBase } from '../../LayoutBase';
import { LayoutColumns } from '../../LayoutColumns';
import type { LayoutProps } from '../../types';
import styles from './styles.css';
import { ExportsSidebar } from './ExportsSidebar';

const APIHero = ({ description, name, pageType, releaseDate, title, version }) => (
  <Hero
    datestamp={releaseDate}
    datestampLabel="Release Date"
    description={description}
    eyebrow={pageType === 'root' ? `Version ${version}` : `${name} - v${version}`}
    title={pageType === 'root' ? name : title}
  />
);

export const TypeDoc: React.FC<LayoutProps> = ({
  BackLinkProps,
  SidebarProps,
  FooterProps,
  meta,
  children
}) => {
  const Sidebar = (
    <>
      {BackLinkProps && (
        <header className={styles.sidebarHeader}>
          <BackLink {...BackLinkProps} />
        </header>
      )}
      <VerticalNavigation />
      {SidebarProps?.helpLinks && <HelpLinks subTitle="Need help?" {...SidebarProps.helpLinks} />}
    </>
  );
  const showHero = meta?.data?.pageType === 'root' || meta?.data?.pageType === 'index';
  const SecondarySidebar = meta?.data?.sidebarNavOptions ? (
    <ExportsSidebar items={meta.data.sidebarNavOptions} />
  ) : null;
  return (
    <LayoutBase Header={<AppHeader />}>
      <LayoutColumns
        PrimarySidebar={Sidebar}
        SecondarySidebar={SecondarySidebar}
        Footer={<Footer {...FooterProps} />}
      >
        <div
          className={classnames('typedoc', {
            'typedoc-index': showHero
          })}
        >
          <Breadcrumbs />
          {showHero && meta?.data ? (
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
        </div>
      </LayoutColumns>
    </LayoutBase>
  );
};
