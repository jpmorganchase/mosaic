import React from 'react';
import classnames from 'classnames';

import styles from './index.css';

export interface ThematicBreakProps extends React.HTMLProps<HTMLHRElement> {}

export const ThematicBreak: React.FC<ThematicBreakProps> = ({ className }) => (
  <hr className={classnames(className, styles.root)} />
);
