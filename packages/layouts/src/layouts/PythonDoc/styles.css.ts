import { style } from '@vanilla-extract/css';
import { responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

export default {
  root: style({
    width: '100%',
    zIndex: 1,
    display: 'flex'
  }),

  main: style({
    width: '100%',
    minWidth: 0,
    display: 'flex',
    justifyContent: 'center'
  }),

  locked: style({
    width: '100%',
    minWidth: 0,
    display: 'flex',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden'
  }),

  columnWrapper: style([
    style({
      display: 'flex',
      width: '100%',
      maxWidth: '1128px'
    }),
    responsiveSprinkles({
      marginX: ['x8', 'x8', 'x8', 'x8']
    })
  ]),

  contentScrollMargin: style({}),

  contentColumn: style([
    style({
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'stretch',
      zIndex: 2,
      width: '100%'
    }),
    responsiveSprinkles({
      paddingTop: ['x10', 'x10', 'x20', 'x20'],
      marginRight: ['none', 'none', 'none', 'x6']
    })
  ]),

  contentBody: style([
    style({
      flexGrow: 1
    })
  ]),

  sidebarHeader: style({ flexShrink: 0 }),

  wrapper: style({
    width: '100%',
    overflow: 'hidden',
    position: 'relative'
  })
};
