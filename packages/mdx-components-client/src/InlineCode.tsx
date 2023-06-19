import React from 'react';
import classnames from 'clsx';
import { code } from '@jpmorganchase/mosaic-theme';

export interface InlineCodeProps extends React.HTMLProps<HTMLPreElement> {}

export const InlineCode: React.FC<React.PropsWithChildren<InlineCodeProps>> = ({
  className,
  ...rest
}) => <code className={classnames(className, code())} {...rest} />;
