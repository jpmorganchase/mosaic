import { Dialog as SaltDialog, type DialogProps as SaltDialogProps } from '@salt-ds/lab';
import { themeClassName } from '@jpmorganchase/mosaic-theme';
import classnames from 'clsx';

import style from './Dialog.css';

interface DialogProps extends SaltDialogProps {}

export const Dialog = ({ className, ...props }: DialogProps) => (
  <SaltDialog className={classnames(themeClassName, style.root, className)} {...props} />
);
