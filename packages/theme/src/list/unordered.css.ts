import { style } from '@vanilla-extract/css';
import { calc } from '@vanilla-extract/css-utils';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { responsiveSprinkles } from '../responsive';
import { beforeElementColorSprinkles } from '../color';

export const unorderedList = recipe({
  base: style([
    responsiveSprinkles({
      paddingLeft: ['none', 'none', 'none', 'none']
    })
  ]),
  variants: {
    variant: {
      document: {},
      regular: {},
      image: {},
      blank: {}
    },
    size: {
      small: {},
      medium: {},
      large: {}
    }
  },
  compoundVariants: [
    {
      variants: {
        variant: 'blank',
        size: 'small'
      },
      style: style({
        marginLeft: vars.space.horizontal.x2,
        paddingLeft: vars.space.horizontal.x6,
        selectors: {
          '&': { marginTop: vars.space.vertical.x4 },
          '& &': { marginTop: vars.space.vertical.x2 },
          '& & &': { marginTop: vars.space.vertical.x2 }
        }
      })
    },
    {
      variants: {
        variant: 'blank',
        size: 'medium'
      },
      style: style({
        marginLeft: vars.space.horizontal.x2,
        paddingLeft: vars.space.horizontal.x6,
        selectors: {
          '&': { marginTop: vars.space.vertical.x4 },
          '& &': { marginTop: vars.space.vertical.x2 },
          '& & &': { marginTop: vars.space.vertical.x2 }
        }
      })
    },
    {
      variants: {
        variant: 'blank',
        size: 'large'
      },
      style: style({
        marginLeft: vars.space.horizontal.x2,
        paddingLeft: vars.space.horizontal.x6,
        selectors: {
          '&': { marginTop: vars.space.vertical.x4 },
          '& &': { marginTop: vars.space.vertical.x2 },
          '& & &': { marginTop: vars.space.vertical.x2 }
        }
      })
    },
    {
      variants: {
        variant: 'document',
        size: 'small'
      },
      style: style({
        marginLeft: vars.space.horizontal.x2,
        paddingLeft: vars.space.horizontal.x6,
        selectors: {
          '&': { marginTop: vars.space.vertical.x4 },
          '& &': { marginTop: vars.space.vertical.x2 },
          '& & &': { marginTop: vars.space.vertical.x2 }
        }
      })
    },
    {
      variants: {
        variant: 'document',
        size: 'medium'
      },
      style: style({
        marginLeft: vars.space.horizontal.x2,
        paddingLeft: vars.space.horizontal.x6,
        selectors: {
          '&': { marginTop: vars.space.vertical.x4 },
          '& &': { marginTop: vars.space.vertical.x2 },
          '& & &': { marginTop: vars.space.vertical.x2 }
        }
      })
    },
    {
      variants: {
        variant: 'document',
        size: 'large'
      },
      style: style({
        marginLeft: vars.space.horizontal.x2,
        paddingLeft: vars.space.horizontal.x6,
        selectors: {
          '&': { marginTop: vars.space.vertical.x4 },
          '& &': { marginTop: vars.space.vertical.x2 },
          '& & &': { marginTop: vars.space.vertical.x2 }
        }
      })
    },
    {
      variants: {
        variant: 'regular',
        size: 'small'
      },
      style: style({
        marginLeft: vars.space.horizontal.x2,
        paddingLeft: vars.space.horizontal.x6,
        selectors: {
          '&': { marginTop: vars.space.vertical.x4 },
          '& &': { marginTop: vars.space.vertical.x2 },
          '& & &': { marginTop: vars.space.vertical.x2 }
        }
      })
    },
    {
      variants: {
        variant: 'regular',
        size: 'medium'
      },
      style: style({
        marginLeft: vars.space.horizontal.x2,
        paddingLeft: vars.space.horizontal.x6,
        selectors: {
          '&': { marginTop: vars.space.vertical.x4 },
          '& &': { marginTop: vars.space.vertical.x2 },
          '& & &': { marginTop: vars.space.vertical.x2 }
        }
      })
    },
    {
      variants: {
        variant: 'regular',
        size: 'large'
      },
      style: style({
        marginLeft: vars.space.horizontal.x2,
        paddingLeft: vars.space.horizontal.x6,
        selectors: {
          '&': { marginTop: vars.space.vertical.x4 },
          '& &': { marginTop: vars.space.vertical.x2 },
          '& & &': { marginTop: vars.space.vertical.x2 }
        }
      })
    },
    {
      variants: {
        variant: 'image',
        size: 'small'
      },
      style: style({
        marginLeft: calc(vars.component.list.unordered.image.small.size)
          .divide(2)
          .add(vars.space.vertical.x4)
          .toString(),
        selectors: {
          '&': { marginTop: vars.space.vertical.x4 },
          '& &': { marginTop: vars.space.vertical.x2 },
          '& & &': { marginTop: vars.space.vertical.x2 }
        }
      })
    },
    {
      variants: {
        variant: 'image',
        size: 'medium'
      },
      style: style({
        marginLeft: calc(vars.component.list.unordered.image.medium.size)
          .divide(2)
          .add(vars.space.vertical.x4)
          .toString(),
        selectors: {
          '&': { marginTop: vars.space.vertical.x4 },
          '& &': { marginTop: vars.space.vertical.x2 },
          '& & &': { marginTop: vars.space.vertical.x2 }
        }
      })
    },
    {
      variants: {
        variant: 'image',
        size: 'large'
      },
      style: style({
        marginLeft: calc(vars.component.list.unordered.image.large.size)
          .divide(2)
          .add(vars.space.vertical.x4)
          .toString(),
        selectors: {
          '&': { marginTop: vars.space.vertical.x4 },
          '& &': { marginTop: vars.space.vertical.x2 },
          '& & &': { marginTop: vars.space.vertical.x2 }
        }
      })
    }
  ],
  defaultVariants: {
    variant: 'document',
    size: 'small'
  }
});
export type UnorderedListVariants = RecipeVariants<typeof unorderedList>;

export const unorderedListItem = recipe({
  base: {
    listStyle: 'none',
    wordWrap: 'break-word'
  },
  variants: {
    variant: {
      document: {},
      regular: {},
      image: {},
      blank: {}
    },
    size: {
      small: {},
      medium: {},
      large: {}
    }
  },
  compoundVariants: [
    {
      variants: {
        variant: 'document',
        size: 'small'
      },
      style: style([
        {
          selectors: {
            '&:before': {
              content: '',
              display: 'inline-block',
              height: vars.component.list.unordered.document.small.size,
              width: vars.component.list.unordered.document.small.size,
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4,
              mask: vars.component.list.unordered.document.small.level1.url,
              maskRepeat: 'no-repeat',
              maskPosition: 'center'
            },
            '& &:before': {
              mask: vars.component.list.unordered.document.small.level2.url,
              maskRepeat: 'no-repeat',
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4
            },
            '& & &:before': {
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4,
              mask: vars.component.list.unordered.document.small.level3.url,
              maskRepeat: 'no-repeat'
            }
          }
        },
        beforeElementColorSprinkles({
          backgroundColor: {
            lightMode: vars.color.light.neutral.foreground.low,
            darkMode: vars.color.dark.neutral.foreground.low
          }
        })
      ])
    },
    {
      variants: {
        variant: 'document',
        size: 'medium'
      },
      style: style([
        {
          selectors: {
            '&:before': {
              content: '',
              display: 'inline-block',
              height: vars.component.list.unordered.document.medium.size,
              width: vars.component.list.unordered.document.medium.size,
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4,
              mask: vars.component.list.unordered.document.medium.level1.url,
              maskRepeat: 'no-repeat',
              maskPosition: 'center'
            },
            '& &:before': {
              mask: vars.component.list.unordered.document.medium.level2.url,
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4,
              maskRepeat: 'no-repeat'
            },
            '& & &:before': {
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4,
              mask: vars.component.list.unordered.document.medium.level3.url,
              maskRepeat: 'no-repeat'
            }
          }
        },
        beforeElementColorSprinkles({
          backgroundColor: {
            lightMode: vars.color.light.neutral.foreground.low,
            darkMode: vars.color.dark.neutral.foreground.low
          }
        })
      ])
    },
    {
      variants: {
        variant: 'document',
        size: 'large'
      },
      style: style([
        {
          selectors: {
            '&:before': {
              content: '',
              display: 'inline-block',
              height: vars.component.list.unordered.document.large.size,
              width: vars.component.list.unordered.document.large.size,
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4,
              mask: vars.component.list.unordered.document.large.level1.url,
              maskRepeat: 'no-repeat',
              maskPosition: 'center'
            },
            '& &:before': {
              mask: vars.component.list.unordered.document.large.level2.url,
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4,
              maskRepeat: 'no-repeat'
            },
            '& & &:before': {
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4,
              mask: vars.component.list.unordered.document.large.level3.url,
              maskRepeat: 'no-repeat'
            }
          }
        },
        beforeElementColorSprinkles({
          backgroundColor: {
            lightMode: vars.color.light.neutral.foreground.low,
            darkMode: vars.color.dark.neutral.foreground.low
          }
        })
      ])
    },
    {
      variants: {
        variant: 'regular',
        size: 'small'
      },
      style: style([
        {
          selectors: {
            '&:before': {
              content: '',
              display: 'inline-block',
              height: vars.component.list.unordered.regular.small.size,
              width: vars.component.list.unordered.regular.small.size,
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4,
              mask: vars.component.list.unordered.regular.small.level1.url,
              maskRepeat: 'no-repeat',
              maskPosition: 'center'
            },
            '& &:before': {
              mask: vars.component.list.unordered.regular.small.level2.url,
              maskRepeat: 'no-repeat',
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4
            },
            '& & &:before': {
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4,
              mask: vars.component.list.unordered.regular.small.level3.url,
              maskRepeat: 'no-repeat'
            }
          }
        },
        beforeElementColorSprinkles({
          backgroundColor: {
            lightMode: vars.color.light.neutral.foreground.high,
            darkMode: vars.color.dark.neutral.foreground.high
          }
        })
      ])
    },
    {
      variants: {
        variant: 'regular',
        size: 'medium'
      },
      style: style([
        {
          selectors: {
            '&:before': {
              content: '',
              display: 'inline-block',
              height: vars.component.list.unordered.regular.medium.size,
              width: vars.component.list.unordered.regular.medium.size,
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4,
              mask: vars.component.list.unordered.regular.medium.level1.url,
              maskRepeat: 'no-repeat',
              maskPosition: 'center'
            },
            '& &:before': {
              mask: vars.component.list.unordered.regular.medium.level2.url,
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4,
              maskRepeat: 'no-repeat'
            },
            '& & &:before': {
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4,
              mask: vars.component.list.unordered.regular.medium.level3.url,
              maskRepeat: 'no-repeat'
            }
          }
        },
        beforeElementColorSprinkles({
          backgroundColor: {
            lightMode: vars.color.light.neutral.foreground.high,
            darkMode: vars.color.dark.neutral.foreground.high
          }
        })
      ])
    },
    {
      variants: {
        variant: 'regular',
        size: 'large'
      },
      style: style([
        {
          selectors: {
            '&:before': {
              content: '',
              display: 'inline-block',
              height: vars.component.list.unordered.regular.large.size,
              width: vars.component.list.unordered.regular.large.size,
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4,
              mask: vars.component.list.unordered.regular.large.level1.url,
              maskRepeat: 'no-repeat',
              maskPosition: 'center'
            },
            '& &:before': {
              mask: vars.component.list.unordered.regular.large.level2.url,
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4,
              maskRepeat: 'no-repeat'
            },
            '& & &:before': {
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4,
              mask: vars.component.list.unordered.regular.large.level3.url,
              maskRepeat: 'no-repeat'
            }
          }
        },
        beforeElementColorSprinkles({
          backgroundColor: {
            lightMode: vars.color.light.neutral.foreground.high,
            darkMode: vars.color.dark.neutral.foreground.high
          }
        })
      ])
    },
    {
      variants: {
        variant: 'image',
        size: 'small'
      },
      style: style([
        {
          selectors: {
            '&:before': {
              content: '',
              display: 'inline-block',
              height: vars.component.list.unordered.image.small.size,
              width: vars.component.list.unordered.image.small.size,
              marginLeft: calc(vars.component.list.unordered.image.small.size)
                .add(vars.space.horizontal.x2)
                .multiply(-1)
                .toString(),
              marginRight: vars.space.horizontal.x4,
              marginTop: vars.space.vertical.x1,
              mask: vars.component.list.unordered.image.small.level1.url,
              maskRepeat: 'no-repeat',
              maskPosition: 'center',
              position: 'absolute'
            },
            '& &:before': {
              mask: vars.component.list.unordered.image.small.level2.url,
              maskRepeat: 'no-repeat',
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4
            },
            '& & &:before': {
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4,
              mask: vars.component.list.unordered.image.small.level3.url,
              maskRepeat: 'no-repeat'
            }
          }
        },
        beforeElementColorSprinkles({
          backgroundColor: {
            lightMode: vars.color.light.brand.category4,
            darkMode: vars.color.dark.brand.category4
          }
        })
      ])
    },
    {
      variants: {
        variant: 'image',
        size: 'medium'
      },
      style: style([
        {
          selectors: {
            '&:before': {
              content: '',
              display: 'inline-block',
              height: vars.component.list.unordered.image.medium.size,
              width: vars.component.list.unordered.image.medium.size,
              marginLeft: calc(vars.component.list.unordered.image.medium.size)
                .add(vars.space.horizontal.x2)
                .multiply(-1)
                .toString(),
              marginRight: vars.space.horizontal.x4,
              marginTop: calc(vars.component.list.unordered.image.medium.size)
                .divide(3)
                .subtract(vars.space.horizontal.x2)
                .multiply(-1)
                .toString(),
              mask: vars.component.list.unordered.image.medium.level1.url,
              maskRepeat: 'no-repeat',
              maskPosition: 'center',
              position: 'absolute'
            },
            '& &:before': {
              mask: vars.component.list.unordered.image.medium.level2.url,
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4,
              maskRepeat: 'no-repeat'
            },
            '& & &:before': {
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4,
              mask: vars.component.list.unordered.image.medium.level3.url,
              maskRepeat: 'no-repeat'
            }
          }
        },
        beforeElementColorSprinkles({
          backgroundColor: {
            lightMode: vars.color.light.brand.category5,
            darkMode: vars.color.dark.brand.category5
          }
        })
      ])
    },
    {
      variants: {
        variant: 'image',
        size: 'large'
      },
      style: style([
        {
          selectors: {
            '&:before': {
              content: '',
              display: 'inline-block',
              height: vars.component.list.unordered.image.large.size,
              width: vars.component.list.unordered.image.large.size,
              marginLeft: calc(vars.component.list.unordered.image.large.size)
                .add(vars.space.horizontal.x2)
                .multiply(-1)
                .toString(),
              marginRight: vars.space.horizontal.x4,
              marginTop: calc(vars.component.list.unordered.image.large.size)
                .divide(3)
                .subtract(vars.space.horizontal.x2)
                .multiply(-1)
                .toString(),
              mask: vars.component.list.unordered.image.large.level1.url,
              maskRepeat: 'no-repeat',
              maskPosition: 'center',
              position: 'absolute'
            },
            '& &:before': {
              mask: vars.component.list.unordered.image.large.level2.url,
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4,
              maskRepeat: 'no-repeat'
            },
            '& & &:before': {
              marginLeft: '-28px',
              marginRight: vars.space.horizontal.x4,
              mask: vars.component.list.unordered.image.large.level3.url,
              maskRepeat: 'no-repeat'
            }
          }
        },
        beforeElementColorSprinkles({
          backgroundColor: {
            lightMode: vars.color.light.brand.category6,
            darkMode: vars.color.dark.brand.category6
          }
        })
      ])
    }
  ],
  defaultVariants: {
    variant: 'document',
    size: 'small'
  }
});
export type UnorderedListItemVariants = RecipeVariants<typeof unorderedListItem>;
