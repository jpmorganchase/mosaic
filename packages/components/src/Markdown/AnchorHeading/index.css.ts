import { createVar, style } from '@vanilla-extract/css';
import { backgroundColor, responsiveSprinkles, vars } from '@jpmorganchase/mosaic-theme';

export const badgeCopiedHeight = createVar();
export const badgeCopiedBorderRadius = createVar();
export const badgeCopiedOffset = createVar();
export const badgeLinkHeight = createVar();
export const badgeLinkBorderRadius = createVar();
export const badgeLinkOffset = createVar();

const root = style({
  vars: {
    [badgeLinkHeight]: '28px',
    [badgeLinkBorderRadius]: '14px',
    [badgeLinkOffset]: '-28',
    [badgeCopiedHeight]: '28px',
    [badgeCopiedBorderRadius]: '36px',
    [badgeCopiedOffset]: '-74'
  },
  display: 'flex',
  alignItems: 'center'
});

export default {
  root,
  heading: style({ minWidth: 0 }),
  link: style({
    display: 'inline-flex',
    flexShrink: 0,
    textDecorationLine: 'none',
    lineHeight: 'inherit',
    opacity: 0,
    selectors: {
      [`${root}:hover &`]: { opacity: 1 },
      '&:focus-visible': { opacity: 1 }
    }
  }),
  copied: style({ opacity: 1 }),
  badgeContainer: style({
    display: 'inline-flex'
  }),
  badge: style([
    backgroundColor({ variant: 'emphasis' }),
    responsiveSprinkles({
      marginLeft: ['x2', 'x2', 'x2', 'x2'],
      paddingX: ['x2', 'x2', 'x2', 'x2'],
      paddingY: ['x2', 'x2', 'x2', 'x2']
    }),
    {
      color: vars.color.light.navigable.link.hover,
      verticalAlign: 'middle',
      display: 'inline-flex',
      borderRadius: badgeLinkBorderRadius,
      textDecoration: 'none'
    }
  ]),
  badgeLink: style({
    height: badgeLinkHeight,
    borderRadius: badgeCopiedBorderRadius,
    right: badgeLinkOffset
  }),
  badgeCopied: style({
    height: badgeCopiedHeight,
    borderRadius: badgeCopiedBorderRadius,
    right: badgeCopiedOffset
  }),
  badgeIcon: style({
    color: vars.color.light.navigable.link.hover,
    display: 'inline-flex'
  }),
  badgeLabel: responsiveSprinkles({
    paddingLeft: ['x1', 'x1', 'x1', 'x1']
  })
};
