import { style } from '@vanilla-extract/css';
import { link } from '@jpmorganchase/mosaic-theme';

export default {
  link: style([
    link({ variant: 'regular' }),
    { fill: 'var(--salt-palette-interact-secondary-foreground)', strokeWidth: 0 }
  ]),
  tree: style({
    maxWidth: '100%',
    height: 'auto',
    overflow: 'visible',
    stroke: 'var(--salt-color-gray-90)',
    fontFamily: 'sans-serif',
    fontSize: 10
  }),
  line: style({
    strokeOpacity: 1.5,
    strokeWidth: 0.4,
    fill: 'none'
  }),
  nodeParent: style({
    strokeOpacity: 1.5,
    strokeWidth: 0.4,
    stroke: 'var(--salt-palette-positive-foreground)',
    fill: 'var(--salt-palette-positive-foreground)'
  }),
  nodeChild: style({
    strokeOpacity: 1.5,
    strokeWidth: 0.4,
    stroke: 'var(--salt-palette-negative-foreground)',
    fill: 'var(--salt-palette-negative-foreground)'
  })
};
