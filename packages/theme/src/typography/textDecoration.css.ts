import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';

export const textDecorationProperties = defineProperties({
  conditions: {
    regular: {},
    hover: { selector: '&:hover, &[data-dp-hover="true"]' }
  },
  defaultCondition: 'regular',
  properties: {
    textDecoration: ['none', 'underline']
  }
});
export const textDecorationSprinkles = createSprinkles(textDecorationProperties);
export type TextDecorationSprinkles = Parameters<typeof textDecorationSprinkles>[0];
