import { style } from '@vanilla-extract/css';
import { responsiveSprinkles, action, unorderedListItem } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    action({ variant: 'action1' }),
    responsiveSprinkles({
      paddingBottom: ['x4', 'x4', 'x4', 'x4']
    })
  ]),
  wrapper: unorderedListItem({ variant: 'blank', size: 'small' })
};
