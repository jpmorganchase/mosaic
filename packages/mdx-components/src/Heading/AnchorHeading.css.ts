import { createVar, style } from '@vanilla-extract/css';
import { backgroundColor, responsiveSprinkles, vars } from '@jpmorganchase/mosaic-theme';

export const badgeCopiedHeight = createVar();
export const badgeCopiedBorderRadius = createVar();
export const badgeCopiedOffset = createVar();
export const badgeLinkHeight = createVar();
export const badgeLinkBorderRadius = createVar();
export const badgeLinkOffset = createVar();

export default {
  root: style({
    vars: {
      [badgeLinkHeight]: '28px',
      [badgeLinkBorderRadius]: '14px',
      [badgeLinkOffset]: '-28',
      [badgeCopiedHeight]: '28px',
      [badgeCopiedBorderRadius]: '36px',
      [badgeCopiedOffset]: '-74'
    },
    display: 'block'
  }),
  link: style({
    display: 'inline',
    textDecorationLine: 'none',
    lineHeight: 'inherit'
  }),
  badgeContainer: style({
    verticalAlign: 'text-bottom',
    position: 'absolute'
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
