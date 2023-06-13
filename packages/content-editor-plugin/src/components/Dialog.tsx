import React from 'react';
import { Dialog as SaltDialog, type DialogProps as SaltDialogProps } from '@salt-ds/lab';
import { themeClassName } from '@jpmorganchase/mosaic-theme';
import classnames from 'clsx';

interface DialogProps extends SaltDialogProps {}

export const Dialog = ({ className, ...props }: DialogProps) => (
  <SaltDialog className={classnames(themeClassName, className)} {...props} />
);
