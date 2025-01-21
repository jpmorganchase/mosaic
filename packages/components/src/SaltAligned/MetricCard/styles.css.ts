import { style } from '@vanilla-extract/css';

export default {
  root: style({
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--salt-spacing-200)',
    textAlign: 'center'
  })
};
