import type { Ref } from 'react';
import { IconProps } from '../Icon';
import type { AccordionProps } from '../Accordion';
import type { CalloutProps } from '../Callout';
import type { CardProps } from '../Card';
import type { CardsProps } from '../Cards';
import type { ComponentExampleProps } from '../ComponentExample';
import type { DataTableProps } from '../DataTable';
import type { FeatureProps } from '../Feature';
import type { FeaturesProps } from '../Features';
import type {
  FilterDropdownProps,
  FilterPillGroupProps,
  FilterSearchProps,
  FilterSortDropdownProps,
  FilterToolbarProps
} from '../FilterToolbar';
import type { FilterViewProps, FilterResultCountProps, FilterNoResultsProps } from '../FilterView';
import type { HelpLinksProps } from '../HelpLinks';
import type { ImpactProps } from '../Impact';
import type { ImpactsProps } from '../Impacts';
import type { LabelProps } from '../Label';
import { LinkBaseProps } from '../LinkBase';
import { LinkTextProps } from '../LinkText';
import type { LinksProps } from '../Links';
import type { TagProps } from '../Tag';
import type { EditionTileLinkProps } from '../EditionTileLink';
import type { GridBaseProps } from '../GridBase';
import type { GridProps } from '../Grid';
import { PageFilterView } from '../PageFilterView';
import type { SecondaryNavbarProps } from '../SecondaryNavbar';
import type { StoryProps } from '../Story';
import { Tab } from '../Tabs';
import type { TabsProps } from '../Tabs';
import type { TilesProps } from '../Tiles';
import type { TileBaseProps } from '../TileBase';
import type { TileButtonProps } from '../TileButton';
import type { TileContentProps } from '../TileContent';
import type { TileContentLabelProps } from '../TileContentLabel';
import type { TileLinkProps } from '../TileLink';
import type { ViewStackProps } from '../ViewStack';
import type { ListItemProps, OrderedListProps, UnOrderedListProps } from '../List';
import { LinkButtonProps } from '../LinkButton';
export { getMarkdownElements } from './markdownElements';
export { withMarkdownSpacing } from './withMarkdownSpacing';
export * from './Pre';
export declare const getMarkdownComponents: () => {
  a: import('react').FC<import('react').PropsWithChildren<import('./Link').MarkdownLinkProps>>;
  blockquote: import('react').FC<
    import('react').PropsWithChildren<import('./BlockQuote').BlockQuoteProps>
  >;
  code: import('react').FC<
    import('react').PropsWithChildren<import('./InlineCode').InlineCodeProps>
  >;
  ol: import('react').FC<import('react').PropsWithChildren<OrderedListProps>>;
  ul: import('react').FC<import('react').PropsWithChildren<UnOrderedListProps>>;
  li: import('react').FC<import('react').PropsWithChildren<ListItemProps>>;
  hr: import('react').FC<
    import('react').PropsWithChildren<import('./ThematicBreak').ThematicBreakProps>
  >;
  h1: (props: any) => JSX.Element;
  h2: (props: any) => JSX.Element;
  h3: (props: any) => JSX.Element;
  h4: (props: any) => JSX.Element;
  h5: (props: any) => JSX.Element;
  h6: (props: any) => JSX.Element;
  p: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  pre: import('react').FC<import('react').PropsWithChildren<import('./Pre').PreProps>>;
  Pre: import('react').FC<import('react').PropsWithChildren<import('./Pre').PreProps>>;
  inlineCode: import('react').FC<
    import('react').PropsWithChildren<import('./InlineCode').InlineCodeProps>
  >;
  table: import('react').FC<import('react').PropsWithChildren<import('./Table').TableProps>>;
  Table: import('react').FC<import('react').PropsWithChildren<import('./Table').TableProps>>;
  tbody: import('react').FC<import('react').PropsWithChildren<import('./Tbody').TbodyProps>>;
  Tbody: import('react').FC<import('react').PropsWithChildren<import('./Tbody').TbodyProps>>;
  thead: import('react').FC<import('react').PropsWithChildren<import('./Thead').TheadProps>>;
  Thead: import('react').FC<import('react').PropsWithChildren<import('./Thead').TheadProps>>;
  th: import('react').FC<import('react').PropsWithChildren<import('./Th').ThProps>>;
  Th: import('react').FC<import('react').PropsWithChildren<import('./Th').ThProps>>;
  td: import('react').FC<import('react').PropsWithChildren<import('./Td').TdProps>>;
  Td: import('react').FC<import('react').PropsWithChildren<import('./Td').TdProps>>;
  tr: import('react').FC<import('react').PropsWithChildren<import('./Tr').TrProps>>;
  Tr: import('react').FC<import('react').PropsWithChildren<import('./Tr').TrProps>>;
  em: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  strong: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Accordion: import('react').FC<import('react').PropsWithChildren<AccordionProps>>;
  AccordionDetails: ({
    className,
    ...rest
  }: Pick<
    import('react').DetailedHTMLProps<
      import('react').HTMLAttributes<HTMLDivElement>,
      HTMLDivElement
    >,
    keyof import('react').HTMLAttributes<HTMLDivElement> | 'key'
  >) => JSX.Element;
  AccordionSection: import('react').ForwardRefExoticComponent<
    import('@salt-ds/core').AccordionProps & import('react').RefAttributes<HTMLDivElement>
  >;
  AccordionSummary: ({
    className,
    ...rest
  }: Pick<
    import('react').DetailedHTMLProps<
      import('react').ButtonHTMLAttributes<HTMLButtonElement>,
      HTMLButtonElement
    >,
    'key' | keyof import('react').ButtonHTMLAttributes<HTMLButtonElement>
  >) => JSX.Element;
  AudioPlayer: import('react').FC<import('../AudioPlayer').AudioPlayerProps>;
  Button: import('react').ForwardRefExoticComponent<
    import('../Button').ButtonProps & import('react').RefAttributes<HTMLButtonElement>
  >;
  Callout: import('react').FC<import('react').PropsWithChildren<CalloutProps>>;
  Card: import('react').FC<import('react').PropsWithChildren<CardProps>>;
  Cards: import('react').FC<import('react').PropsWithChildren<CardsProps>>;
  ComponentExample: import('react').FC<import('react').PropsWithChildren<ComponentExampleProps>>;
  DataTable: import('react').FC<
    import('react').PropsWithChildren<
      DataTableProps<any> & {
        ref?: Ref<HTMLTableElement> | undefined;
      }
    >
  >;
  EditionFilterView: import('react').FC<
    import('react').PropsWithChildren<import('../EditionFilterView').EditionFilterViewProps>
  >;
  EditionTileLink: import('react').FC<import('react').PropsWithChildren<EditionTileLinkProps>>;
  Feature: import('react').FC<import('react').PropsWithChildren<FeatureProps>>;
  FeatureActions: import('react').FC<
    import('react').PropsWithChildren<import('../Feature').FeatureActionsProps>
  >;
  FeatureContent: import('react').FC<import('../Feature').FeatureContentProps>;
  FeatureEyebrow: import('react').FC<import('../Feature').FeatureEyebrowProps>;
  FeatureTitle: import('react').FC<import('../Feature').FeatureTitleProps>;
  Features: import('react').FC<import('react').PropsWithChildren<FeaturesProps>>;
  FilterView: import('react').FC<import('react').PropsWithChildren<FilterViewProps<any>>>;
  FilterDropdown: import('react').FC<import('react').PropsWithChildren<FilterDropdownProps>>;
  FilterToolbar: import('react').FC<import('react').PropsWithChildren<FilterToolbarProps>>;
  FilterNoResults: import('react').FC<import('react').PropsWithChildren<FilterNoResultsProps>>;
  FilterPillGroup: import('react').FC<import('react').PropsWithChildren<FilterPillGroupProps>>;
  FilterSortDropdown: import('react').FC<
    import('react').PropsWithChildren<FilterSortDropdownProps>
  >;
  FilterSearch: import('react').FC<import('react').PropsWithChildren<FilterSearchProps>>;
  FilterResultCount: import('react').FC<import('react').PropsWithChildren<FilterResultCountProps>>;
  Grid: import('react').FC<import('react').PropsWithChildren<GridProps>>;
  GridBase: import('react').FC<import('react').PropsWithChildren<GridBaseProps>>;
  Hero: import('react').FC<import('react').PropsWithChildren<import('../Hero').HeroProps>>;
  HelpLinks: import('react').FC<import('react').PropsWithChildren<HelpLinksProps>>;
  Icon: import('react').FC<import('react').PropsWithChildren<IconProps>>;
  Impact: import('react').FC<import('react').PropsWithChildren<ImpactProps>>;
  Impacts: import('react').FC<import('react').PropsWithChildren<ImpactsProps>>;
  Label: import('react').FC<import('react').PropsWithChildren<LabelProps>>;
  Link: import('react').ForwardRefExoticComponent<
    import('../Link').LinkProps & import('react').RefAttributes<HTMLLinkElement>
  >;
  LinkBase: import('react').FC<import('react').PropsWithChildren<LinkBaseProps>>;
  LinkButton: import('react').FC<import('react').PropsWithChildren<LinkButtonProps>>;
  LinkText: import('react').FC<import('react').PropsWithChildren<LinkTextProps>>;
  Links: import('react').FC<import('react').PropsWithChildren<LinksProps>>;
  ListItem: import('react').FC<import('react').PropsWithChildren<ListItemProps>>;
  OrderedList: import('react').FC<import('react').PropsWithChildren<OrderedListProps>>;
  PageFilterView: typeof PageFilterView;
  Tag: import('react').FC<import('react').PropsWithChildren<TagProps>>;
  SecondaryNavbar: import('react').FC<import('react').PropsWithChildren<SecondaryNavbarProps>>;
  SectionHeading: import('react').FC<import('../SectionHeading').SectionHeadingProps>;
  StickyHeader: import('react').FC<
    import('react').PropsWithChildren<import('../StickyHeader').StickyHeaderProps>
  >;
  Story: import('react').FC<import('react').PropsWithChildren<StoryProps>>;
  Tabs: import('react').FC<import('react').PropsWithChildren<TabsProps>>;
  Tab: typeof Tab;
  TabsBase: import('react').FC<
    import('react').PropsWithChildren<import('../TabsBase').TabsBaseProps>
  >;
  Tiles: import('react').FC<import('react').PropsWithChildren<TilesProps>>;
  TileBase: import('react').FC<import('react').PropsWithChildren<TileBaseProps>>;
  TileButton: import('react').FC<import('react').PropsWithChildren<TileButtonProps>>;
  TileContent: import('react').FC<import('react').PropsWithChildren<TileContentProps>>;
  TileContentLabel: import('react').FC<import('react').PropsWithChildren<TileContentLabelProps>>;
  TileLink: import('react').FC<import('react').PropsWithChildren<TileLinkProps>>;
  UnorderedList: import('react').FC<import('react').PropsWithChildren<UnOrderedListProps>>;
  ViewStack: import('react').FC<import('react').PropsWithChildren<ViewStackProps<any>>>;
  VideoPlayer: import('react').FC<
    import('react').PropsWithChildren<import('../VideoPlayer').VideoPlayerProps>
  >;
  View: typeof Tab;
  Action1: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Action2: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Action3: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Action4: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Action5: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Action6: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Action7: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Action8: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Caption1: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Caption2: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Caption3: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Caption4: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Caption5: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Caption6: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Hr: import('react').FC<
    import('react').PropsWithChildren<import('./ThematicBreak').ThematicBreakProps>
  >;
  H0: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  H1: (props: any) => JSX.Element;
  H2: (props: any) => JSX.Element;
  H3: (props: any) => JSX.Element;
  H4: (props: any) => JSX.Element;
  H5: (props: any) => JSX.Element;
  H6: (props: any) => JSX.Element;
  P1: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  P2: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  P3: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  P4: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  P5: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  P6: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Subtitle1: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Subtitle2: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Subtitle3: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Subtitle4: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Subtitle5: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Subtitle6: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Amount: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Eyebrow: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Watermark: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Emphasis: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
  Strong: import('react').FC<import('react').PropsWithChildren<import('..').TypographyProps>>;
};
