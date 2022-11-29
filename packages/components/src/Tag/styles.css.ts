import { style } from '@vanilla-extract/css';
import {
  tag,
  responsiveSprinkles,
  brandBorder,
  brandColor,
  neutralBorder,
  foregroundColor,
  paragraph
} from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    paragraph({ variant: 'paragraph5' }),
    {
      display: 'inline',
      border: 0.1,
      borderRadius: '5px',
      borderStyle: 'solid'
    }
  ]),
  label: style([
    tag({ variant: 'regular' }),
    responsiveSprinkles({
      paddingX: ['x2', 'x2', 'x2', 'x2']
    })
  ]),
  icon: responsiveSprinkles({
    marginRight: ['x2', 'x2', 'x2', 'x2']
  }),
  small: style([paragraph({ variant: 'paragraph6' })]),
  medium: style([paragraph({ variant: 'paragraph5' })]),
  large: style([paragraph({ variant: 'paragraph3' })]),
  category0: style([foregroundColor({ variant: 'mid' })]),
  category1: brandColor({ variant: 'category1' }),
  category2: brandColor({ variant: 'category2' }),
  category3: brandColor({ variant: 'category3' }),
  category4: brandColor({ variant: 'category4' }),
  category5: brandColor({ variant: 'category5' }),
  category6: brandColor({ variant: 'category6' }),
  border0: neutralBorder({ variant: 'mid', borderWidth: 'thin' }),
  border1: brandBorder({ variant: 'category1', borderWidth: 'thin' }),
  border2: brandBorder({ variant: 'category2', borderWidth: 'thin' }),
  border3: brandBorder({ variant: 'category3', borderWidth: 'thin' }),
  border4: brandBorder({ variant: 'category4', borderWidth: 'thin' }),
  border5: brandBorder({ variant: 'category5', borderWidth: 'thin' }),
  border6: brandBorder({ variant: 'category6', borderWidth: 'thin' })
};
