import React from 'react';
import classnames from 'clsx';

import styles from './index.css';

export interface ThematicBreakProps extends React.HTMLProps<HTMLHRElement> {}

export const ThematicBreak: React.FC<React.PropsWithChildren<ThematicBreakProps>> = ({
  className
}) => <hr className={classnames(className, styles.root)} />;
