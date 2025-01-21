import { style } from '@vanilla-extract/css';

export default {
  root: style({
    display: 'flex',
    flexDirection: 'row',
    gap: 'var(--salt-spacing-300)'
  }),
  content: style({
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--salt-spacing-100)',
    flex: 1
  }),
  action: style({
    marginTop: 'auto'
  })
};
