import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';

import { vars } from '../vars.css';
import { darkMode, lightMode } from './lightMode';

export const beforeElementColorProperties = defineProperties({
  conditions: {
    lightMode: { selector: `${lightMode} &:before` },
    darkMode: { selector: `${darkMode} &:before` }
  },
  defaultCondition: 'lightMode',
  properties: {
    color: [
      vars.color.light.neutral.foreground.low,
      vars.color.light.neutral.foreground.mid,
      vars.color.light.neutral.foreground.high,
      vars.color.dark.neutral.foreground.low,
      vars.color.dark.neutral.foreground.mid,
      vars.color.dark.neutral.foreground.high,
      vars.color.light.brand.category1,
      vars.color.light.brand.category2,
      vars.color.light.brand.category3,
      vars.color.light.brand.category4,
      vars.color.light.brand.category5,
      vars.color.light.brand.category6,
      vars.color.dark.brand.category1,
      vars.color.dark.brand.category2,
      vars.color.dark.brand.category3,
      vars.color.dark.brand.category4,
      vars.color.dark.brand.category5,
      vars.color.dark.brand.category6
    ],
    /*
     We use CSS mask to colorize the contents of svgs loaded from outside document
     Hence this uses the foreground color rather than background color
     */
    backgroundColor: [
      vars.color.light.neutral.foreground.low,
      vars.color.light.neutral.foreground.mid,
      vars.color.light.neutral.foreground.high,
      vars.color.dark.neutral.foreground.low,
      vars.color.dark.neutral.foreground.mid,
      vars.color.dark.neutral.foreground.high,
      vars.color.light.brand.category1,
      vars.color.light.brand.category2,
      vars.color.light.brand.category3,
      vars.color.light.brand.category4,
      vars.color.light.brand.category5,
      vars.color.light.brand.category6,
      vars.color.dark.brand.category1,
      vars.color.dark.brand.category2,
      vars.color.dark.brand.category3,
      vars.color.dark.brand.category4,
      vars.color.dark.brand.category5,
      vars.color.dark.brand.category6
    ]
  }
});
export const beforeElementColorSprinkles = createSprinkles(beforeElementColorProperties);
export type BeforeElementColorSprinkles = Parameters<typeof beforeElementColorSprinkles>[0];
