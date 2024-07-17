import { style } from '@vanilla-extract/css';
import { responsiveSprinkles, action, unorderedListItem } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    action({ variant: 'action1' }),
    responsiveSprinkles({
      paddingBottom: ['x4', 'x4', 'x4', 'x4']
    })
  ]),
  ol: style([
    {
      display: 'flex',
      padding: 0,
      listStyle: 'none',
      alignItems: 'center',
      justifyContent: 'flex-start'
    },
    responsiveSprinkles({
      gap: ['x2', 'x2', 'x2', 'x2']
    })
  ]),
  breadcrumb: style([
    {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start'
    },
    responsiveSprinkles({
      gap: ['x2', 'x2', 'x2', 'x2']
    }),
    unorderedListItem({ variant: 'blank', size: 'small' })
  ])
};
