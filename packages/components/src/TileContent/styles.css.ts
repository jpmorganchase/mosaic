import { style } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';
import {
  action,
  foregroundColor,
  neutralBorder,
  caption,
  heading,
  paragraph,
  responsiveSprinkles
} from '@jpmorganchase/mosaic-theme';

export default {
  root: style({
    display: 'flex'
  }),
  action: style([
    action({ variant: 'action1' }),
    responsiveSprinkles({
      marginTop: ['x4', 'x4', 'x4', 'x4']
    })
  ]),
  body: style([
    {
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    },
    responsiveSprinkles({
      paddingX: ['x4', 'x4', 'x4', 'x4']
    })
  ]),
  caption: style([
    caption({ variant: 'caption6' }),
    responsiveSprinkles({
      paddingTop: ['x2', 'x2', 'x2', 'x2']
    })
  ]),
  columnLayout: style({
    flexDirection: 'column'
  }),
  rowLayout: style({
    flexDirection: 'row'
  }),
  textContent: style({
    flexGrow: 1
  })
};

export const eyebrowRecipe = recipe({
  base: caption({ variant: 'caption3' }),
  variants: {
    imagePlacement: {
      top: responsiveSprinkles({
        marginTop: ['x4', 'x4', 'x4', 'x4']
      }),
      left: responsiveSprinkles({
        marginTop: ['none', 'none', 'none', 'none']
      }),
      fullWidth: responsiveSprinkles({
        marginTop: ['x4', 'x4', 'x4', 'x4']
      })
    }
  },
  defaultVariants: {
    imagePlacement: 'top'
  }
});
export type EyebrowVariants = RecipeVariants<typeof eyebrowRecipe>;

export const tileImageRecipe = recipe({
  variants: {
    imagePlacement: {
      top: responsiveSprinkles({
        paddingLeft: ['x4', 'x4', 'x4', 'x4']
      }),
      left: responsiveSprinkles({
        paddingLeft: ['x4', 'x4', 'x4', 'x4']
      }),
      fullWidth: neutralBorder({ variant: 'high', borderBottomWidth: 'thick' })
    }
  },
  defaultVariants: {
    imagePlacement: 'top'
  }
});
export type TileImageVariants = RecipeVariants<typeof tileImageRecipe>;

export const imageRecipe = recipe({
  variants: {
    imagePlacement: {
      top: style([
        {
          height: '80px',
          width: '80px'
        }
      ]),
      left: style([
        {
          height: '80px',
          width: '80px'
        }
      ]),
      fullWidth: {
        height: '186px'
      }
    }
  },
  defaultVariants: {
    imagePlacement: 'top'
  }
});
export type ImageVariants = RecipeVariants<typeof imageRecipe>;

export const titleRecipe = recipe({
  base: [foregroundColor({ variant: 'high' }), { wordBreak: 'break-word' }],
  variants: {
    imagePlacement: {
      top: {},
      left: {},
      fullWidth: {},
      fitContent: {}
    },
    size: {
      small: paragraph({ variant: 'paragraph3' }),
      medium: heading({ variant: 'heading6' }),
      large: heading({ variant: 'heading6' }),
      fullWidth: heading({ variant: 'heading6' }),
      fitContent: heading({ variant: 'heading6' })
    },
    hasEyebrow: {
      yes: {},
      no: {}
    }
  },
  compoundVariants: [
    {
      variants: {
        imagePlacement: 'left',
        hasEyebrow: 'no'
      },
      style: responsiveSprinkles({ marginTop: ['none', 'none', 'none', 'none'] })
    },
    {
      variants: {
        imagePlacement: 'top',
        hasEyebrow: 'no'
      },
      style: responsiveSprinkles({ marginTop: ['x4', 'x4', 'x4', 'x4'] })
    },
    {
      variants: {
        imagePlacement: 'fullWidth',
        hasEyebrow: 'no'
      },
      style: responsiveSprinkles({ marginTop: ['x4', 'x4', 'x4', 'x4'] })
    },
    {
      variants: {
        imagePlacement: 'left',
        hasEyebrow: 'yes'
      },
      style: responsiveSprinkles({ marginTop: ['x2', 'x2', 'x2', 'x2'] })
    },
    {
      variants: {
        imagePlacement: 'top',
        hasEyebrow: 'yes'
      },
      style: responsiveSprinkles({ marginTop: ['x2', 'x2', 'x2', 'x2'] })
    },
    {
      variants: {
        imagePlacement: 'fullWidth',
        hasEyebrow: 'yes'
      },
      style: responsiveSprinkles({ marginTop: ['x2', 'x2', 'x2', 'x2'] })
    }
  ],
  defaultVariants: {
    hasEyebrow: 'no',
    imagePlacement: 'top',
    size: 'small'
  }
});
export type TitleVariants = RecipeVariants<typeof titleRecipe>;

export const descriptionRecipe = recipe({
  base: responsiveSprinkles({ marginTop: ['x2', 'x2', 'x2', 'x2'] }),
  variants: {
    size: {
      small: paragraph({ variant: 'paragraph6' }),
      medium: paragraph({ variant: 'paragraph4' }),
      large: paragraph({ variant: 'paragraph4' }),
      fullWidth: paragraph({ variant: 'paragraph4' }),
      fitContent: paragraph({ variant: 'paragraph4' })
    }
  },
  defaultVariants: {
    size: 'small'
  }
});
export type DescriptionVariants = RecipeVariants<typeof descriptionRecipe>;

export const rootRecipe = recipe({
  base: style([
    {
      display: 'flex',
      height: '100%'
    },
    responsiveSprinkles({ paddingY: ['x4', 'x4', 'x4', 'x4'] })
  ]),
  variants: {
    imagePlacement: {
      left: style({ flexDirection: 'row' }),
      top: style({ flexDirection: 'column' }),
      fullWidth: style([
        { width: '100%' },
        responsiveSprinkles({
          paddingX: ['none', 'none', 'none', 'none']
        })
      ])
    }
  },
  defaultVariants: {
    imagePlacement: 'top'
  }
});
export type RootVariants = RecipeVariants<typeof rootRecipe>;
