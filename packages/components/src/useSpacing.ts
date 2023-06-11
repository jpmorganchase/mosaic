'use client';
import { GutterTop } from './common/types';

const multiplierAliases: { [key: string]: number } = {
  component: 6,
  paragraph: 6,
  group: 6,
  groupItem: 0
};

export const useSpacing = (gutterTop: GutterTop): string | GutterTop => {
  if (gutterTop === undefined) {
    return;
  }
  return multiplierAliases[gutterTop] != null
    ? `spacing${multiplierAliases[gutterTop]} spacing-vert-${multiplierAliases[gutterTop]}`
    : `spacing${gutterTop} spacing-vert-${gutterTop}`;
};
