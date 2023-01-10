import React, { ReactElement } from 'react';
import classnames from 'classnames';
import { Avatar } from '@salt-ds/lab';

import styles from './styles.css';

function toUpperFirst(str) {
  return `${str.substr(0, 1).toUpperCase()}${str.toLowerCase().substr(1)}`;
}

export function UserProfile({
  avatarUrl,
  className,
  firstName,
  prefixText = ''
}: {
  avatarUrl: string;
  className?: string;
  firstName: string;
  prefixText?: string;
}): ReactElement {
  return (
    <div className={classnames(styles.root, className)}>
      <Avatar className={styles.avatar} size="medium" src={avatarUrl} />
      <span className={styles.firstName}>{`${prefixText}${toUpperFirst(firstName)}`}</span>
    </div>
  );
}
