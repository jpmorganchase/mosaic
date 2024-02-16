import {
  a,
  em,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  hr,
  li,
  ol,
  p,
  ul,
  inlineCode
} from '@jpmorganchase/mosaic-mdx-components';
import type { MDXComponents } from 'mdx/types';

export const mdxElements = {
  a,
  em,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  hr,
  li,
  ol,
  p,
  ul,
  code: inlineCode
} as unknown as MDXComponents;
