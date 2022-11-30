import { style } from '@vanilla-extract/css';
import { responsiveSprinkles, action } from '@dpmosaic/theme';

export default {
  root: style([
    action({ variant: 'action1' }),
    responsiveSprinkles({
      paddingBottom: ['x4', 'x4', 'x4', 'x4']
    })
  ])
};
