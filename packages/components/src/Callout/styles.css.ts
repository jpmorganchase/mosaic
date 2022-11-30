import { style } from '@vanilla-extract/css';
import {
  backgroundColor,
  calloutBorder,
  calloutColor,
  foregroundColor,
  paragraph,
  responsiveSprinkles
} from '@jpmorganchase/mosaic-theme';

const defaultBorder = calloutBorder({
  variant: 'note',
  borderTopWidth: 'thick',
  borderBottomWidth: 'medium'
});

export default {
  root: style([
    {
      width: '100%'
    },
    backgroundColor({ variant: 'regular' }),
    responsiveSprinkles({
      paddingTop: ['x4', 'x4', 'x4', 'x4'],
      paddingBottom: ['x4', 'x4', 'x4', 'x4']
    })
  ]),
  title: style([
    {
      verticalAlign: 'middle'
    },
    paragraph({ variant: 'paragraph1' })
  ]),
  content: style([
    paragraph({ variant: 'paragraph4' }),
    responsiveSprinkles({
      paddingLeft: ['x4', 'x4', 'x4', 'x4'],
      paddingTop: ['x2', 'x2', 'x2', 'x2']
    }),
    foregroundColor({ variant: 'high' })
  ]),
  icon: style([
    {
      verticalAlign: 'middle'
    },
    responsiveSprinkles({
      paddingLeft: ['x4', 'x4', 'x4', 'x4'],
      paddingRight: ['x2', 'x2', 'x2', 'x2']
    })
  ]),
  caution: calloutColor({ variant: 'caution' }),
  important: calloutColor({ variant: 'important' }),
  note: calloutColor({ variant: 'note' }),
  tip: calloutColor({ variant: 'tip' }),
  warning: calloutColor({ variant: 'warning' }),
  cautionBorder: calloutBorder({
    variant: 'caution',
    borderTopWidth: 'thick',
    borderBottomWidth: 'medium'
  }),
  importantBorder: calloutBorder({
    variant: 'important',
    borderTopWidth: 'thick',
    borderBottomWidth: 'medium'
  }),
  noteBorder: defaultBorder,
  tipBorder: calloutBorder({
    variant: 'tip',
    borderTopWidth: 'thick',
    borderBottomWidth: 'medium'
  }),
  warningBorder: calloutBorder({
    variant: 'warning',
    borderTopWidth: 'thick',
    borderBottomWidth: 'medium'
  })
};
