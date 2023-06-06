'use client';
import React from 'react';
import { withTableOfContentsAdapter } from './withTableOfContentsAdapter';
import { TableOfContents as OriginalTableOfContents } from './TableOfContents';
import type { TableOfContentsProps } from './TableOfContents';

export { withTableOfContentsAdapter } from './withTableOfContentsAdapter';
export const TableOfContents: React.FC<TableOfContentsProps> =
  withTableOfContentsAdapter(OriginalTableOfContents);
