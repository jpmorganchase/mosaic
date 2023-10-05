import { config, responsiveSprinkles } from '@jpmorganchase/mosaic-theme';
import { style } from '@vanilla-extract/css';

export default {
  root: style([
    style({
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      maxWidth: `${config.main.width}px`,
      marginLeft: 'auto',
      marginRight: 'auto'
    }),
    responsiveSprinkles({
      marginTop: ['x10', 'x10', 'x20', 'x20'],
      paddingLeft: ['x4', 'x6', 'x6', 'x6'],
      paddingRight: ['x4', 'x6', 'x6', 'x6']
    })
  ])
};
