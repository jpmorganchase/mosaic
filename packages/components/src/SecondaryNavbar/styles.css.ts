import { style } from '@vanilla-extract/css';
import { neutralBorder, responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

const styles = {
  navbar: {
    marginRight: 'auto'
  },
  root: style([
    {
      justifyContent: 'flex-start',
      boxSizing: 'border-box'
    },
    neutralBorder({ variant: 'low', borderBottomWidth: 'thin' })
  ]),

  tab: responsiveSprinkles({
    paddingX: ['x2', 'x2', 'x2', 'x2']
  }),
  supportLink: style([
    { display: 'flex', flex: '1 1', justifyContent: 'flex-end', whiteSpace: 'nowrap' },
    responsiveSprinkles({
      marginRight: ['x2', 'x2', 'x2', 'x2']
    })
  ])
};

export default styles;
