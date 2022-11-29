import { link, responsiveSprinkles } from '@jpmorganchase/mosaic-theme';
import { style } from '@vanilla-extract/css';
export default {
  root: style([
    {
      display: 'inline-block'
    }
  ]),
  document: link({ variant: 'document' }),
  regular: link({ variant: 'regular' }),
  disabled: style({}),
  icon: style([
    {
      color: 'inherit',
      stroke: 'currentColor'
    },
    responsiveSprinkles({
      paddingX: ['x1', 'x1', 'x1', 'x1']
    })
  ])
};
