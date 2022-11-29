import { style } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';
import {
  action,
  caption,
  foregroundColor,
  heading,
  neutralBorder,
  paragraph,
  responsiveSprinkles
} from '@jpmorganchase/mosaic-theme';

export const tileImageRecipe = recipe({
  base: responsiveSprinkles({
    marginRight: ['none', 'x4', 'x4', 'x4'],
    marginBottom: ['x4', 'none', 'none', 'none']
  }),
  variants: {
    imagePlacement: {
      left: {
        width: '100px',
        height: '100px'
      },
      fullWidth: neutralBorder({ variant: 'high', borderBottomWidth: 'thick' })
    }
  },
  defaultVariants: {
    imagePlacement: 'left'
  }
});
export type TileImageVariants = RecipeVariants<typeof tileImageRecipe>;

export const imageRecipe = recipe({
  variants: {
    imagePlacement: {
      left: style([
        {
          height: '100px',
          width: '100px'
        }
      ]),
      fullWidth: {
        width: '100%',
        height: '186px'
      }
    }
  },
  defaultVariants: {
    imagePlacement: 'left'
  }
});
export type ImageVariants = RecipeVariants<typeof imageRecipe>;

export default {
  root: style([
    neutralBorder({ variant: 'low', borderBottomWidth: 'thin' }),
    foregroundColor({ variant: 'high' }),
    responsiveSprinkles({
      padding: ['x8', 'x8', 'x8', 'x8']
    })
  ]),
  content: style([
    {
      display: 'flex',
      width: '100%'
    },
    responsiveSprinkles({
      flexDirection: ['column', 'row', 'row', 'row']
    })
  ]),
  eyebrow: style([
    caption({ variant: 'caption2' }),
    responsiveSprinkles({
      marginBottom: ['x2', 'x2', 'x2', 'x2']
    })
  ]),
  title: style([
    heading({ variant: 'heading5' }),
    responsiveSprinkles({
      marginBottom: ['x2', 'x2', 'x2', 'x2']
    })
  ]),
  description: style([
    paragraph({ variant: 'paragraph4' }),
    responsiveSprinkles({
      marginBottom: ['x4', 'x4', 'x4', 'x4']
    })
  ]),
  action: style([
    action({ variant: 'action1' }),
    responsiveSprinkles({
      marginTop: ['x4', 'x4', 'x4', 'x4']
    })
  ])
};
