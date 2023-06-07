import { style } from '@vanilla-extract/css';
import { responsiveSprinkles, vars } from '@jpmorganchase/mosaic-theme';

const root = style({});

export default {
  root,
  liveError: style([
    {
      backgroundColor: 'red',
      color: 'white'
    },
    responsiveSprinkles({
      marginBottom: ['none', 'none', 'none', 'none'],
      padding: ['x4', 'x4', 'x4', 'x4']
    })
  ]),
  liveEditor: style([{ backgroundColor: 'black', color: 'white', overflow: 'scroll' }]),
  showLiveCodeContainer: style({
    position: 'relative'
  }),
  showLiveCode: style({
    right: vars.space.horizontal.x4,
    bottom: '0px',
    position: 'absolute',
    lineHeight: 'initial'
  })
};
