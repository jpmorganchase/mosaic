import { useStore } from './store';
import { useRoute } from '.';

type NextPrevItem = { link: string; text: string };

export function useNextPrev() {
  const sidebarData = useStore(state => state.sidebarData) || [];
  const { route } = useRoute();
  const { next, prev } = findNextPrevForRoute(sidebarData, route);

  return {
    next,
    prev
  };
}

const findNextPrevForRoute = (nodes, route) => {
  const flattenedNodes = flatten(nodes);
  return findNextPrevNodes(flattenedNodes, route);
};

const flatten = nodes => {
  let flattenedNodes: NextPrevItem[] = [];
  nodes.forEach(node => {
    flattenedNodes.push({ link: node.data.link, text: node.name });
    if (node.childNodes) {
      flattenedNodes = flattenedNodes.concat(flatten(node.childNodes));
    }
  });
  return flattenedNodes;
};

const findNextPrevNodes = (nodes, route) => {
  const index = nodes.map(e => e.link).indexOf(route);
  const { length } = nodes;
  const next = nextExists(index, length) ? nodes[index + 1] : null;
  const prev = prevExists(index, length) ? nodes[index - 1] : null;
  return { next, prev };
};

const nextExists = (index, length) => index >= 0 && index < length - 1;

const prevExists = (index, length) => index > 0 && index < length;
