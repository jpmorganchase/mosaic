import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { responsiveConditions } from './responsive.css';

export const sidebarProperties = defineProperties({
  conditions: responsiveConditions,
  defaultCondition: 'mobile',
  responsiveArray: ['mobile', 'tablet', 'web', 'desktop'],
  properties: {
    display: ['block', 'none'],
    width: { ...vars.space.horizontal, wide: 'auto', narrow: '23%', drawer: '72%' },
    marginRight: vars.space.horizontal,
    marginLeft: vars.space.horizontal
  }
});

export const sidebarSprinkles = createSprinkles(sidebarProperties);
export type SidebarSprinkles = Parameters<typeof sidebarSprinkles>[0];

export const sidebar = recipe({
  variants: {
    variant: {
      left: sidebarSprinkles({
        display: ['block', 'block', 'block', 'block'],
        width: ['wide', 'wide', 'narrow', 'wide'],
        marginRight: ['none', 'none', 'none', 'none'],
        marginLeft: ['none', 'none', 'none', 'none']
      }),
      leftEmpty: sidebarSprinkles({
        display: ['none', 'none', 'none', 'block'],
        width: ['none', 'none', 'narrow', 'wide'],
        marginRight: ['none', 'none', 'none', 'none'],
        marginLeft: ['none', 'none', 'none', 'none']
      }),
      drawer: sidebarSprinkles({
        display: ['block', 'block', 'block', 'block'],
        width: ['drawer', 'drawer', 'narrow', 'wide'],
        marginRight: ['none', 'none', 'none', 'none'],
        marginLeft: ['none', 'none', 'none', 'none']
      }),
      right: sidebarSprinkles({
        display: ['none', 'none', 'none', 'block'],
        width: ['none', 'none', 'none', 'wide'],
        marginRight: ['none', 'none', 'none', 'none'],
        marginLeft: ['none', 'none', 'none', 'none']
      })
    }
  },
  defaultVariants: {
    variant: 'left'
  }
});
export type SidebarVariants = RecipeVariants<typeof sidebar>;
