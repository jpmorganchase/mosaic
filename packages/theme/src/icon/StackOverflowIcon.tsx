import * as React from 'react';
import { Icon, IconProps } from '@salt-ds/icons';

export const StackOverflowIcon: React.FC<IconProps> = props => (
  <Icon {...props}>
    <svg viewBox="0 0 14 14">
      <g>
        <polygon points="12.1,8.1 12.1,13 2.9,13 2.9,8 2,8 2,14 2.1,14 2.1,14 12.1,14 13,14 13,13 13,8.1" />
        <rect height="1" width="6.9" x="4.1" y="11" />
        <rect
          height="6.9"
          transform="matrix(0.3629 -0.9318 0.9318 0.3629 -0.5851 11.5564)"
          width="1"
          x="7.7"
          y="2.8"
        />{' '}
        <polygon points="11,9 4.2,7.8 4.1,8.8 10.9,10" />
        <rect
          height="6.9"
          transform="matrix(0.6344 -0.773 0.773 0.6344 0.6792 8.7852)"
          width="1"
          x="9.1"
          y="0.2"
        />
      </g>
    </svg>
  </Icon>
);
