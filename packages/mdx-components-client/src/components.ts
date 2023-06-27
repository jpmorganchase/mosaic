import { Ref } from 'react';
import {
  Accordion as MosaicAccordion,
  AccordionProps,
  Callout as MosaicCallout,
  CalloutProps,
  Card as MosaicCard,
  CardProps,
  Cards as MosaicCards,
  CardsProps,
  ComponentExample as MosaicComponentExample,
  ComponentExampleProps,
  DataTable as MosaicDataTable,
  DataTableProps,
  EditionTileLink as MosaicEditionTileLink,
  EditionTileLinkProps,
  Feature as MosaicFeature,
  FeatureProps,
  Features as MosaicFeatures,
  FeaturesProps,
  FilterDropdown as MosaicFilterDropdown,
  FilterDropdownProps,
  FilterNoResults as MosaicFilterNoResults,
  FilterNoResultsProps,
  FilterPillGroup as MosaicFilterPillGroup,
  FilterPillGroupProps,
  FilterResultCount as MosaicFilterResultCount,
  FilterResultCountProps,
  FilterSearch as MosaicFilterSearch,
  FilterSearchProps,
  FilterSortDropdown as MosaicFilterSortDropdown,
  FilterSortDropdownProps,
  FilterToolbar as MosaicFilterToolbar,
  FilterToolbarProps,
  FilterView as MosaicFilterView,
  FilterViewProps,
  Grid as MosaicGrid,
  GridBase as MosaicGridBase,
  GridBaseProps,
  GridProps,
  HelpLinks as MosaicHelpLinks,
  HelpLinksProps,
  Icon as MosaicIcon,
  IconProps,
  Impact as MosaicImpact,
  ImpactProps,
  Impacts as MosaicImpacts,
  ImpactsProps,
  Label as MosaicLabel,
  LabelProps,
  LinkBase as MosaicLinkBase,
  LinkBaseProps,
  Links as MosaicLinks,
  LinksProps,
  LinkText as MosaicLinkText,
  LinkTextProps,
  ListItem as MosaicListItem,
  ListItemProps,
  OrderedList as MosaicOrderedList,
  OrderedListProps,
  SecondaryNavbar as MosaicSecondaryNavbar,
  SecondaryNavbarProps,
  Story as MosaicStory,
  StoryProps,
  Tabs as MosaicTabs,
  TabsProps,
  Tag as MosaicTag,
  TagProps,
  TileBase as MosaicTileBase,
  TileBaseProps,
  TileButton as MosaicTileButton,
  TileButtonProps,
  TileContent as MosaicTileContent,
  TileContentLabel as MosaicTileContentLabel,
  TileContentLabelProps,
  TileContentProps,
  TileLink as MosaicTileLink,
  TileLinkProps,
  Tiles as MosaicTiles,
  TilesProps,
  UnorderedList as MosaicUnorderedList,
  UnOrderedListProps,
  ViewStack as MosaicViewStack,
  ViewStackProps
} from '@jpmorganchase/mosaic-components';
import { withMarkdownSpacing } from './withMarkdownSpacing';

export {
  AudioPlayer,
  AccordionDetails,
  AccordionSection,
  AccordionSummary,
  Button,
  EditionFilterView,
  FeatureActions,
  FeatureContent,
  FeatureEyebrow,
  FeatureTitle,
  Hero,
  Link,
  SectionHeading,
  StickyHeader,
  Tab,
  TabsBase,
  PageFilterView,
  VideoPlayer,
  View
} from '@jpmorganchase/mosaic-components';
export * from './FormattedContent';
export * from './markdownElements';
export * from './typography';

export const Accordion = withMarkdownSpacing<AccordionProps>(MosaicAccordion);
export const Callout = withMarkdownSpacing<CalloutProps>(MosaicCallout);
export const Card = withMarkdownSpacing<CardProps>(MosaicCard);
export const Cards = withMarkdownSpacing<CardsProps>(MosaicCards);
export const ComponentExample = withMarkdownSpacing<ComponentExampleProps>(MosaicComponentExample);
export const DataTable = withMarkdownSpacing<DataTableProps<any> & { ref?: Ref<HTMLTableElement> }>(
  MosaicDataTable
);
export const EditionTileLink = withMarkdownSpacing<EditionTileLinkProps>(MosaicEditionTileLink);
export const Feature = withMarkdownSpacing<FeatureProps>(MosaicFeature);
export const Features = withMarkdownSpacing<FeaturesProps>(MosaicFeatures);
export const FilterView = withMarkdownSpacing<FilterViewProps<any>>(MosaicFilterView);
export const FilterDropdown = withMarkdownSpacing<FilterDropdownProps>(MosaicFilterDropdown);
export const FilterToolbar = withMarkdownSpacing<FilterToolbarProps>(MosaicFilterToolbar);
export const FilterNoResults = withMarkdownSpacing<FilterNoResultsProps>(MosaicFilterNoResults);
export const FilterPillGroup = withMarkdownSpacing<FilterPillGroupProps>(MosaicFilterPillGroup);
export const FilterSortDropdown =
  withMarkdownSpacing<FilterSortDropdownProps>(MosaicFilterSortDropdown);
export const FilterSearch = withMarkdownSpacing<FilterSearchProps>(MosaicFilterSearch);
export const FilterResultCount =
  withMarkdownSpacing<FilterResultCountProps>(MosaicFilterResultCount);
export const Grid = withMarkdownSpacing<GridProps>(MosaicGrid);
export const GridBase = withMarkdownSpacing<GridBaseProps>(MosaicGridBase);
export const HelpLinks = withMarkdownSpacing<HelpLinksProps>(MosaicHelpLinks);
export const Icon = withMarkdownSpacing<IconProps>(MosaicIcon, 'regular', true);
export const Impact = withMarkdownSpacing<ImpactProps>(MosaicImpact);
export const Impacts = withMarkdownSpacing<ImpactsProps>(MosaicImpacts);
export const Label = withMarkdownSpacing<LabelProps>(MosaicLabel);
export const LinkBase = withMarkdownSpacing<LinkBaseProps>(MosaicLinkBase);
export const LinkText = withMarkdownSpacing<LinkTextProps>(MosaicLinkText);
export const Links = withMarkdownSpacing<LinksProps>(MosaicLinks);
export const ListItem = withMarkdownSpacing<ListItemProps>(MosaicListItem);
export const OrderedList = withMarkdownSpacing<OrderedListProps>(MosaicOrderedList);
export const Tag = withMarkdownSpacing<TagProps>(MosaicTag);
export const SecondaryNavbar = withMarkdownSpacing<SecondaryNavbarProps>(MosaicSecondaryNavbar);
export const Story = withMarkdownSpacing<StoryProps>(MosaicStory);
export const Tabs = withMarkdownSpacing<TabsProps>(MosaicTabs);
export const Tiles = withMarkdownSpacing<TilesProps>(MosaicTiles);
export const TileBase = withMarkdownSpacing<TileBaseProps>(MosaicTileBase);
export const TileButton = withMarkdownSpacing<TileButtonProps>(MosaicTileButton);
export const TileContent = withMarkdownSpacing<TileContentProps>(MosaicTileContent);
export const TileContentLabel = withMarkdownSpacing<TileContentLabelProps>(MosaicTileContentLabel);
export const TileLink = withMarkdownSpacing<TileLinkProps>(MosaicTileLink);
export const UnorderedList = withMarkdownSpacing<UnOrderedListProps>(MosaicUnorderedList);
export const ViewStack = withMarkdownSpacing<ViewStackProps<any>>(MosaicViewStack);
