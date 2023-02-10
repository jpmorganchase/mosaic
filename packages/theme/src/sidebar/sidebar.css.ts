import { style } from '@vanilla-extract/css';
import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { config } from '../config';
import { responsiveConditions, responsiveSprinkles } from '../responsive/responsive.css';

export const sidebarProperties = defineProperties({
  conditions: responsiveConditions,
  defaultCondition: 'mobile',
  responsiveArray: ['mobile', 'tablet', 'web', 'desktop'],
  properties: {
    display: ['block', 'none'],
    width: { none: '0px', wide: 'auto', narrow: '23%', drawer: 'auto' }
  }
});

export const sidebarSprinkles = createSprinkles(sidebarProperties);
export type SidebarSprinkles = Parameters<typeof sidebarSprinkles>[0];

export const sidebar = recipe({
  base: style([
    {
      bottom: 0,
      overflowY: 'scroll',
      position: 'relative',
      top: `${config.appHeader.height}px`,
      height: `calc(100% - ${config.appHeader.height}px)`
    },
    responsiveSprinkles({
      marginRight: ['none', 'none', 'none', 'none'],
      marginLeft: ['none', 'none', 'none', 'none'],
      marginTop: ['x4', 'x4', 'x4', 'x4'],
      paddingTop: ['x1', 'x1', 'x1', 'x1'],
      paddingBottom: ['none', 'none', 'none', 'none']
    }),
    sidebarSprinkles({
      display: ['block', 'block', 'block', 'block'],
      width: ['wide', 'wide', 'narrow', 'wide']
    })
  ]),
  variants: {
    side: {
      left: {
        width: `${config.sidebarLeft.width}px`
      },
      right: {
        width: `${config.sidebarRight.width}px`
      }
    }
  },
  defaultVariants: {
    side: 'left'
  }
});

export type SidebarVariants = RecipeVariants<typeof sidebar>;
