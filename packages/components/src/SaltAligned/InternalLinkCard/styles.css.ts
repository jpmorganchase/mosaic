import { globalStyle, style } from '@vanilla-extract/css';

const root = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--salt-spacing-200)'
});

globalStyle(`${root} p`, {
  marginTop: 0
});

export default {
  root,
  content: style({
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--salt-spacing-100)'
  }),
  action: style({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--salt-spacing-100)',
    color: 'var(--salt-content-primary-foreground)',
    textDecoration: 'var(--salt-navigable-textDecoration)',
    marginTop: 'auto',
    ':hover': {
      color: 'var(--salt-content-foreground-hover)',
      textDecoration: 'var(--salt-navigable-textDecoration-hover)'
    },
    ':focus': {
      outline: 'var(--salt-focused-outline)'
    },
    selectors: {
      [`${root}:hover &`]: {
        color: 'var(--salt-content-foreground-hover)',
        textDecoration: 'var(--salt-navigable-textDecoration-hover)'
      }
    }
  })
};
