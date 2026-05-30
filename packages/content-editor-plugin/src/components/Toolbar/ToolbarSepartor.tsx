import { type ReactNode } from 'react';
import { Divider } from '@salt-ds/core';

interface ToolbarSeparatorProps {
  className?: string;
  children?: ReactNode;
}

export const ToolbarSeparator = ({ className, ...rest }: ToolbarSeparatorProps) => (
  <Divider className={className} orientation="vertical" variant="secondary" {...rest} />
);
