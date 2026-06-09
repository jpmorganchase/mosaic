import { style } from '@vanilla-extract/css';

export default {
  root: style({
    display: 'flex',
    flexDirection: 'row',
    position: 'relative',
    maxHeight: '100%',
    whiteSpace: 'nowrap',
    alignItems: 'center',
    maxWidth: '240px',
    gap: 'var(--salt-spacing-50)'
  }),
  firstName: style([
    {
      textOverflow: 'ellipsis',
      overflow: 'hidden'
    }
  ])
};
