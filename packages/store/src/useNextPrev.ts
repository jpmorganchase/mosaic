import { useStore } from './store';
import { useRoute } from './useRoute';
import type { SidebarItem } from './types/sidebar';

type NextPrevItem = { link: string; text: string };

export function useNextPrev() {
  const sidebarData = useStore(state => state.sidebarData) || [];
  const { route } = useRoute();
  const { next, prev } = findNextPrevForRoute(sidebarData, route || '');

  return {
    next,
    prev
  };
}

const flatten = (nodes: SidebarItem[]): NextPrevItem[] => {
  const flattenedNode = nodes.reduce<NextPrevItem[]>((result, node) => {
    if (!node) {
      return result;
    }
    let nextResult = [...result, { link: node.data.link, text: node.name }];
    if (node.childNodes) {
      nextResult = [...result, ...flatten(node.childNodes)];
    }
    return nextResult;
  }, []);
  return flattenedNode;
};

const nextExists = (index: number, length: number) => index >= 0 && index < length - 1;

const prevExists = (index: number, length: number) => index > 0 && index < length;

const findNextPrevNodes = (nodes: NextPrevItem[], route: string) => {
  const index = nodes.map(e => e.link).indexOf(route);
  const { length } = nodes;
  const next = nextExists(index, length) ? nodes[index + 1] : null;
  const prev = prevExists(index, length) ? nodes[index - 1] : null;
  return { next, prev };
};

const findNextPrevForRoute = (nodes: SidebarItem[], route: string) => {
  const flattenedNodes = flatten(nodes);
  return findNextPrevNodes(flattenedNodes, route);
};
