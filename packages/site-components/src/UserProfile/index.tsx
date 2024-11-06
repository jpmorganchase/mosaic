import { ReactElement } from 'react';
import classnames from 'clsx';
import { Avatar } from '@salt-ds/core';

import styles from './styles.css';

function toUpperFirst(str) {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
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
      <Avatar className={styles.avatar} size={1} src={avatarUrl} />
      <span className={styles.firstName}>{`${prefixText}${toUpperFirst(firstName)}`}</span>
    </div>
  );
}
