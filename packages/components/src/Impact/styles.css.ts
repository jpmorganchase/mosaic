import { style } from '@vanilla-extract/css';
import {
  amount,
  backgroundColor,
  impact,
  neutralBorder,
  paragraph,
  responsiveSprinkles
} from '@jpmorganchase/mosaic-theme';

const styles = {
  root: style([
    {
      alignContent: 'center',
      display: 'flex',
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center'
    },
    responsiveSprinkles({
      padding: ['x3', 'x3', 'x4', 'x4']
    }),
    neutralBorder({
      variant: 'low',
      borderTopWidth: 'thin',
      borderRightWidth: 'thin',
      borderBottomWidth: 'thin',
      borderLeftWidth: 'thin'
    })
  ]),
  image: style([
    {
      boxSizing: 'content-box',
      position: 'relative',
      left: '50%',
      transform: 'translateX(-50%)'
    },
    backgroundColor({ variant: 'regular' }),
    responsiveSprinkles({
      paddingX: ['x2', 'x2', 'x2', 'x2']
    }),
    impact.image
  ]),
  label: style([
    {
      textAlign: 'center'
    },
    paragraph({ variant: 'paragraph6' }),
    responsiveSprinkles({
      paddingTop: ['x2', 'x2', 'x2', 'x2']
    })
  ]),
  line: style([
    {
      height: '1px',
      position: 'relative'
    },
    neutralBorder({ variant: 'low', borderBottomWidth: 'thin' }),
    impact.line
  ]),
  title: style([
    {
      textAlign: 'center'
    },
    amount(),
    responsiveSprinkles({
      marginX: ['auto', 'auto', 'auto', 'auto']
    })
  ])
};

export default styles;
