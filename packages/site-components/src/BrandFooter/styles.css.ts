import { style } from '@vanilla-extract/css';

export default {
  root: style({
    display: 'flex',
    flexDirection: 'column',
    padding: 'var(--salt-spacing-300)',
    gap: 'var(--salt-spacing-300)',
    borderTop:
      'var(--salt-size-border) var(--salt-separable-borderStyle) var(--salt-separable-secondary-borderColor)'
  }),
  sitemap: style({
    display: 'flex',
    gap: 'var(--salt-spacing-400)'
  }),
  sitemapSection: style({
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--salt-spacing-100)',
    minWidth: '10ch'
  }),
  link: style({
    fontSize: 'var(--salt-text-fontSize)',
    lineHeight: 'var(--salt-text-lineHeight)',
    fontWeight: 'var(--salt-text-fontWeight)'
  })
};
