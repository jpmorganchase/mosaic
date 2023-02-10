import { style } from '@vanilla-extract/css';
import { config, responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

const styles = {
  fullWidth: style([
    style({
      maxWidth: `${config.main.wideWidth}px`,
      marginLeft: 'auto',
      marginRight: 'auto'
    }),
    responsiveSprinkles({
      marginTop: ['x10', 'x10', 'x20', 'x20'],
      paddingLeft: ['x4', 'x6', 'x6', 'x6'],
      paddingRight: ['x4', 'x6', 'x6', 'x6']
    })
  ]),
  withSidebar: style([
    style({
      width: '100%',
      zIndex: 1,
      display: 'flex'
    })
  ]),

  mainWrapper: style({
    width: '100%',
    minWidth: 0,
    display: 'flex',
    justifyContent: 'center'
  }),

  columnWrapper: style([
    style({
      display: 'flex',
      width: '100%',
      maxWidth: `${config.main.width}px`
    }),
    responsiveSprinkles({
      paddingX: ['x8', 'x8', 'x8', 'x8']
    })
  ]),

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

  toggleButton: style([
    {
      selectors: {
        ['button.&']: {
          display: 'block',
          position: 'fixed',
          zIndex: 5,
          padding: '0px',
          boxSizing: 'content-box',
          width: `${config.appHeader.height}px`,
          height: `${config.appHeader.height}px`
        }
      }
    },
    responsiveSprinkles({
      bottom: ['x6', 'x6', 'x6', 'x6'],
      right: ['x6', 'x6', 'x6', 'x6']
    })
  ])
};

export default styles;
