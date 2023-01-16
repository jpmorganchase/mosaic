import { recipes } from '@jpmorganchase/mosaic-theme';
import { useColorMode } from '@jpmorganchase/mosaic-store';
import flowImpl from 'lodash/flow';

type SortViewByDate = (view: Array<{ [key: string]: string }>) => Array<{ [key: string]: string }>;
type SortValueCallback = (item: { [key: string]: string }) => string;
type SortViewByDateFactory = ({
  dateKey
}: {
  dateKey: string | SortValueCallback;
}) => SortViewByDate;

/** Sort the view in date order, newest first */
const sortViewByDate: SortViewByDateFactory =
  ({ dateKey }) =>
  view => {
    const sortedView = view.sort((a, b) => {
      const dateAString = typeof dateKey === 'function' ? dateKey(a) : a[dateKey];
      const dateBString = typeof dateKey === 'function' ? dateKey(b) : b[dateKey];
      let timestampA = Date.parse(dateAString);
      let timestampB = Date.parse(dateBString);
      timestampA = Number.isNaN(timestampA) === false ? timestampA : 0;
      timestampB = Number.isNaN(timestampB) === false ? timestampB : 0;
      return new Date(timestampB).valueOf() - new Date(timestampA).valueOf();
    });
    return sortedView;
  };

type Filter = (view: Array<{ [key: string]: string }>) => Array<{ [key: string]: string }>;
type FilterCallback = (item: { [key: string]: string }) => void;
type FilterFactory = ({ filter }: { filter: FilterCallback }) => Filter;

/** Filter the view via filter callback */
const filter: FilterFactory =
  ({ filter: filterProp }) =>
  view => {
    const filteredView = view.filter(filterProp);
    return filteredView;
  };

/** Limit the number of results */
type Limit = (view: Array<{ [key: string]: string }>) => Array<{ [key: string]: string }>;
type LimitFactory = ({ max }: { max: number }) => Limit;

const limit: LimitFactory =
  ({ max }) =>
  view =>
    view.slice(0, Math.min(max, view.length));

const flow = (...funcs) => flowImpl(...funcs);

export function createMDXScope(meta = {}) {
  return {
    helpers: {
      flow,
      filter,
      limit,
      sortViewByDate
    },
    recipes,
    hooks: {
      useColorMode
    },
    meta
  };
}
