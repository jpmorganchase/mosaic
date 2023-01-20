import { style } from '@vanilla-extract/css';
import {
  action,
  neutralBorder,
  responsiveSprinkles,
  foregroundColor,
  link
} from '@jpmorganchase/mosaic-theme';

export default {
  button: style([
    responsiveSprinkles({
      marginRight: 'auto',
      marginTop: ['x6', 'x6', 'x6', 'x6']
    })
  ]),
  content: style([responsiveSprinkles({ marginRight: ['x4', 'x4', 'x4', 'x4'] })]),
  description: style([responsiveSprinkles({ marginBottom: ['x6', 'x6', 'none', 'none'] })]),
  icon: style({
    fontSize: '0.8em',
    color: 'inherit',
    fill: 'currentColor'
  }),
  link: style([
    responsiveSprinkles({
      marginRight: ['none', 'x6', 'none', 'none']
    }),
    action({ variant: 'action1' }),
    link({ variant: 'regular' }),
    style({
      alignItems: 'center',
      display: 'flex',
      flexWrap: 'nowrap'
    })
  ]),
  links: style([
    responsiveSprinkles({
      flexDirection: ['column', 'row', 'column', 'column'],
      marginLeft: ['none', 'none', 'x6', 'x6'],
      marginRight: ['auto', 'auto', 'x6', 'x6'],
      rowGap: ['x2', 'x2', 'x2', 'x2']
    }),
    style({
      justifyContent: 'center',
      display: 'flex'
    })
  ]),
  root: style([
    responsiveSprinkles({
      flexDirection: ['column', 'column', 'row', 'row'],
      paddingTop: 'x10',
      paddingBottom: 'x10',
      marginTop: ['x4', 'x15', 'x20', 'x20']
    }),
    style({
      display: 'flex',
      flexGrow: 0,
      justifyContent: 'space-between',
      whiteSpace: 'normal'
    }),
    neutralBorder({ variant: 'mid', borderTopWidth: 'thin' }),
    foregroundColor({ variant: 'high' })
  ]),
  startAdornment: style([responsiveSprinkles({ marginRight: ['x2', 'x2', 'x2', 'x2'] })]),
  endAdornment: style([responsiveSprinkles({ marginLeft: ['x2', 'x2', 'x2', 'x2'] })]),
  title: style([
    responsiveSprinkles({ marginBottom: ['x6', 'x6', 'x6', 'x6'] }),
    style({
      whiteSpace: 'normal'
    })
  ])
};
