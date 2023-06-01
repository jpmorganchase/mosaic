'use client';
import type { Ref } from 'react';
import {
  action,
  amount,
  caption,
  eyebrow,
  heading,
  paragraph,
  subtitle,
  watermark
} from '@jpmorganchase/mosaic-theme';
import { Icon, IconProps } from '../Icon';
import { getMarkdownElements } from './markdownElements';
import { Accordion, AccordionSection, AccordionDetails, AccordionSummary } from '../Accordion';
import type { AccordionProps } from '../Accordion';
import { AudioPlayer } from '../AudioPlayer';
import { Button } from '../Button';
import { Callout } from '../Callout';
import type { CalloutProps } from '../Callout';
import { Card } from '../Card';
import type { CardProps } from '../Card';
import { Cards } from '../Cards';
import type { CardsProps } from '../Cards';
import { ComponentExample } from '../ComponentExample';
import type { ComponentExampleProps } from '../ComponentExample';
import { DataTable } from '../DataTable';
import type { DataTableProps } from '../DataTable';
import { Feature, FeatureActions, FeatureContent, FeatureTitle, FeatureEyebrow } from '../Feature';
import type { FeatureProps } from '../Feature';
import type { FeaturesProps } from '../Features';
import { Features } from '../Features';
import {
  FilterDropdown,
  FilterPillGroup,
  FilterSearch,
  FilterSortDropdown,
  FilterToolbar
} from '../FilterToolbar';
import type {
  FilterDropdownProps,
  FilterPillGroupProps,
  FilterSearchProps,
  FilterSortDropdownProps,
  FilterToolbarProps
} from '../FilterToolbar';
import { FilterNoResults, FilterResultCount, FilterView } from '../FilterView';
import type { FilterViewProps, FilterResultCountProps, FilterNoResultsProps } from '../FilterView';
import { HelpLinks } from '../HelpLinks';
import type { HelpLinksProps } from '../HelpLinks';
import { Hero } from '../Hero';
import { Impact } from '../Impact';
import type { ImpactProps } from '../Impact';
import { Impacts } from '../Impacts';
import type { ImpactsProps } from '../Impacts';
import { Label } from '../Label';
import type { LabelProps } from '../Label';
import { Link } from '../Link';
import { LinkBase, LinkBaseProps } from '../LinkBase';
import { LinkText, LinkTextProps } from '../LinkText';
import { Links } from '../Links';
import type { LinksProps } from '../Links';
import { Tag } from '../Tag';
import type { TagProps } from '../Tag';
import { EditionFilterView } from '../EditionFilterView';
import type { EditionTileLinkProps } from '../EditionTileLink';
import { EditionTileLink } from '../EditionTileLink';
import { GridBase } from '../GridBase';
import type { GridBaseProps } from '../GridBase';
import { Grid } from '../Grid';
import type { GridProps } from '../Grid';
import { PageFilterView } from '../PageFilterView';
import { SecondaryNavbar } from '../SecondaryNavbar';
import type { SecondaryNavbarProps } from '../SecondaryNavbar';
import { SectionHeading } from '../SectionHeading';
import { StickyHeader } from '../StickyHeader';
import { Story } from '../Story';
import type { StoryProps } from '../Story';
import { TabsBase } from '../TabsBase';
import { Tabs, Tab } from '../Tabs';
import type { TabsProps } from '../Tabs';
import { Tiles } from '../Tiles';
import type { TilesProps } from '../Tiles';
import { TileBase } from '../TileBase';
import type { TileBaseProps } from '../TileBase';
import { TileButton } from '../TileButton';
import type { TileButtonProps } from '../TileButton';
import { TileContent } from '../TileContent';
import type { TileContentProps } from '../TileContent';
import { TileContentLabel } from '../TileContentLabel';
import type { TileContentLabelProps } from '../TileContentLabel';
import { TileLink } from '../TileLink';
import type { TileLinkProps } from '../TileLink';
import { VideoPlayer } from '../VideoPlayer';
import { ViewStack, View } from '../ViewStack';
import type { ViewStackProps } from '../ViewStack';
import { withStyledTypography } from '../Typography/withStyledTypography';
import { withMarkdownSpacing } from './withMarkdownSpacing';
import { ListItem, OrderedList, UnorderedList } from '../List';
import type { ListItemProps, OrderedListProps, UnOrderedListProps } from '../List';

export { getMarkdownElements } from './markdownElements';

export { withMarkdownSpacing } from './withMarkdownSpacing';
export * from './Pre';

const markdownElements = getMarkdownElements();
export const getMarkdownComponents = () => ({
  Accordion: withMarkdownSpacing<AccordionProps>(Accordion),
  AccordionDetails,
  AccordionSection,
  AccordionSummary,
  AudioPlayer,
  Button,
  Callout: withMarkdownSpacing<CalloutProps>(Callout),
  Card: withMarkdownSpacing<CardProps>(Card),
  Cards: withMarkdownSpacing<CardsProps>(Cards),
  ComponentExample: withMarkdownSpacing<ComponentExampleProps>(ComponentExample),
  DataTable: withMarkdownSpacing<DataTableProps<any> & { ref?: Ref<HTMLTableElement> }>(DataTable),
  EditionFilterView,
  EditionTileLink: withMarkdownSpacing<EditionTileLinkProps>(EditionTileLink),
  Feature: withMarkdownSpacing<FeatureProps>(Feature),
  FeatureActions,
  FeatureContent,
  FeatureEyebrow,
  FeatureTitle,
  Features: withMarkdownSpacing<FeaturesProps>(Features),
  FilterView: withMarkdownSpacing<FilterViewProps<any>>(FilterView),
  FilterDropdown: withMarkdownSpacing<FilterDropdownProps>(FilterDropdown),
  FilterToolbar: withMarkdownSpacing<FilterToolbarProps>(FilterToolbar),
  FilterNoResults: withMarkdownSpacing<FilterNoResultsProps>(FilterNoResults),
  FilterPillGroup: withMarkdownSpacing<FilterPillGroupProps>(FilterPillGroup),
  FilterSortDropdown: withMarkdownSpacing<FilterSortDropdownProps>(FilterSortDropdown),
  FilterSearch: withMarkdownSpacing<FilterSearchProps>(FilterSearch),
  FilterResultCount: withMarkdownSpacing<FilterResultCountProps>(FilterResultCount),
  Grid: withMarkdownSpacing<GridProps>(Grid),
  GridBase: withMarkdownSpacing<GridBaseProps>(GridBase),
  Hero,
  HelpLinks: withMarkdownSpacing<HelpLinksProps>(HelpLinks),
  Icon: withMarkdownSpacing<IconProps>(Icon, 'regular', true),
  Impact: withMarkdownSpacing<ImpactProps>(Impact),
  Impacts: withMarkdownSpacing<ImpactsProps>(Impacts),
  Label: withMarkdownSpacing<LabelProps>(Label),
  Link,
  LinkBase: withMarkdownSpacing<LinkBaseProps>(LinkBase),
  LinkText: withMarkdownSpacing<LinkTextProps>(LinkText),
  Links: withMarkdownSpacing<LinksProps>(Links),
  ListItem: withMarkdownSpacing<ListItemProps>(ListItem),
  OrderedList: withMarkdownSpacing<OrderedListProps>(OrderedList),
  PageFilterView,
  Tag: withMarkdownSpacing<TagProps>(Tag),
  SecondaryNavbar: withMarkdownSpacing<SecondaryNavbarProps>(SecondaryNavbar),
  SectionHeading,
  StickyHeader,
  Story: withMarkdownSpacing<StoryProps>(Story),
  Tabs: withMarkdownSpacing<TabsProps>(Tabs),
  Tab,
  TabsBase,
  Tiles: withMarkdownSpacing<TilesProps>(Tiles),
  TileBase: withMarkdownSpacing<TileBaseProps>(TileBase),
  TileButton: withMarkdownSpacing<TileButtonProps>(TileButton),
  TileContent: withMarkdownSpacing<TileContentProps>(TileContent),
  TileContentLabel: withMarkdownSpacing<TileContentLabelProps>(TileContentLabel),
  TileLink: withMarkdownSpacing<TileLinkProps>(TileLink),
  UnorderedList: withMarkdownSpacing<UnOrderedListProps>(UnorderedList),
  ViewStack: withMarkdownSpacing<ViewStackProps<any>>(ViewStack),
  VideoPlayer,
  View,
  Action1: withStyledTypography(action({ variant: 'action1', context: 'markdown' })),
  Action2: withStyledTypography(action({ variant: 'action2', context: 'markdown' })),
  Action3: withStyledTypography(action({ variant: 'action3', context: 'markdown' })),
  Action4: withStyledTypography(action({ variant: 'action4', context: 'markdown' })),
  Action5: withStyledTypography(action({ variant: 'action5', context: 'markdown' })),
  Action6: withStyledTypography(action({ variant: 'action6', context: 'markdown' })),
  Action7: withStyledTypography(action({ variant: 'action7', context: 'markdown' })),
  Action8: withStyledTypography(action({ variant: 'action8', context: 'markdown' })),
  Caption1: withStyledTypography(caption({ variant: 'caption1', context: 'markdown' })),
  Caption2: withStyledTypography(caption({ variant: 'caption2', context: 'markdown' })),
  Caption3: withStyledTypography(caption({ variant: 'caption3', context: 'markdown' })),
  Caption4: withStyledTypography(caption({ variant: 'caption4', context: 'markdown' })),
  Caption5: withStyledTypography(caption({ variant: 'caption5', context: 'markdown' })),
  Caption6: withStyledTypography(caption({ variant: 'caption6', context: 'markdown' })),
  Hr: markdownElements.hr,
  H0: withStyledTypography(heading({ variant: 'heading0', context: 'markdown' }), 'h1'),
  H1: markdownElements.h1,
  H2: markdownElements.h2,
  H3: markdownElements.h3,
  H4: markdownElements.h4,
  H5: markdownElements.h5,
  H6: markdownElements.h6,
  P1: markdownElements.p,
  P2: withStyledTypography(paragraph({ variant: 'paragraph2', context: 'markdown' })),
  P3: withStyledTypography(paragraph({ variant: 'paragraph3', context: 'markdown' })),
  P4: withStyledTypography(paragraph({ variant: 'paragraph4', context: 'markdown' })),
  P5: withStyledTypography(paragraph({ variant: 'paragraph5', context: 'markdown' })),
  P6: withStyledTypography(paragraph({ variant: 'paragraph6', context: 'markdown' })),
  Subtitle1: withStyledTypography(subtitle({ variant: 'subtitle1', context: 'markdown' })),
  Subtitle2: withStyledTypography(subtitle({ variant: 'subtitle2', context: 'markdown' })),
  Subtitle3: withStyledTypography(subtitle({ variant: 'subtitle3', context: 'markdown' })),
  Subtitle4: withStyledTypography(subtitle({ variant: 'subtitle4', context: 'markdown' })),
  Subtitle5: withStyledTypography(subtitle({ variant: 'subtitle5', context: 'markdown' })),
  Subtitle6: withStyledTypography(subtitle({ variant: 'subtitle6', context: 'markdown' })),
  Amount: withStyledTypography(amount({ context: 'markdown' })),
  Eyebrow: withStyledTypography(eyebrow({ context: 'markdown' })),
  Watermark: withStyledTypography(watermark({ context: 'markdown' })),
  Emphasis: markdownElements.em,
  Strong: markdownElements.strong
  // ...markdownElements
});
