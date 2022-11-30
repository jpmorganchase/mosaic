import { style } from '@vanilla-extract/css';
import { responsiveSprinkles } from '@dpmosaic/theme';

export default {
  root: style([
    {
      display: 'flex'
    },
    responsiveSprinkles({
      marginTop: ['x10', 'x10', 'x10', 'x10']
    })
  ]),
  tile: style([
    {
      height: '100%'
    }
  ]),
  left: style([
    {
      width: '50%',
      marginRight: 'auto'
    },
    responsiveSprinkles({ paddingRight: ['x3', 'x3', 'x3', 'x3'] })
  ]),
  right: style([
    {
      width: '50%',
      marginLeft: 'auto'
    },
    responsiveSprinkles({ paddingLeft: ['x3', 'x3', 'x3', 'x3'] })
  ]),
  link: style([
    {
      flexGrow: 1,
      overflow: 'hidden'
    },
    responsiveSprinkles({
      padding: ['x4', 'x4', 'x4', 'x4']
    })
  ]),
  linkText: style([
    {
      textOverflow: 'ellipsis',
      overflow: 'hidden'
    }
  ]),
  icon: style([
    {
      color: 'inherit',
      marginTop: ['x1', 'x1', 'x1', 'x1']
    }
  ]),
  iconPrev: style([
    {
      float: 'left'
    },
    responsiveSprinkles({
      paddingRight: ['x2', 'x2', 'x2', 'x2']
    })
  ]),
  iconNext: style([
    {
      float: 'right'
    },
    responsiveSprinkles({
      paddingLeft: ['x2', 'x2', 'x2', 'x2']
    })
  ]),
  nextLink: style([
    {
      textAlign: 'right'
    }
  ])
};
