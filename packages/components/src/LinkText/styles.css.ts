import { link, responsiveSprinkles } from '@jpmorganchase/mosaic-theme';
import { style, globalStyle } from '@vanilla-extract/css';

const iconStyle = style([
  {
    color: 'inherit',
    stroke: 'currentColor',
    height: '1em'
  },
  responsiveSprinkles({
    paddingX: ['x1', 'x1', 'x1', 'x1']
  })
]);

export default {
  root: style([
    {
      display: 'inline-block'
    }
  ]),
  document: link({ variant: 'document' }),
  regular: link({ variant: 'regular' }),
  disabled: style({}),
  icon: iconStyle
};

globalStyle(`${iconStyle} > svg.saltIcon`, {
  height: 'calc(1em - 3px)',
  minHeight: 'auto'
});
