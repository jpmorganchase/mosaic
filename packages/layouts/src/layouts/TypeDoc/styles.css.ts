import { style } from '@vanilla-extract/css';
import { responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

export default {
  columnWrapper: style([
    style({
      display: 'flex',
      justifyContent: 'stretch',
      width: '100%',
      maxWidth: '1440px',
      marginLeft: 'auto',
      marginRight: 'auto'
    }),
    responsiveSprinkles({
      paddingLeft: ['x4', 'x6', 'x6', 'x6'],
      paddingRight: ['x4', 'x6', 'x6', 'x6']
    })
  ]),

  contentBody: style([
    style({
      zIndex: 2,
      flexGrow: 1,
      flexShrink: 1,
      // We're letting flexGrow do the width calc here, so as long as
      // the width is smaller than the space the layout will be correct.
      width: '1px'
    }),
    responsiveSprinkles({
      paddingTop: ['x10', 'x10', 'x20', 'x20']
    })
  ]),

  sidebarHeader: style({ flexShrink: 0 }),

  wrapper: style({
    width: '100%',
    overflow: 'hidden',
    position: 'relative'
  })
};
