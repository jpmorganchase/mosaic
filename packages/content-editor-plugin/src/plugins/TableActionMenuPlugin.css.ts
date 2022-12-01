import { lightModeConditions, vars } from '@jpmorganchase/mosaic-theme';
import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';

export const outlineProperties = defineProperties({
  conditions: {
    ...lightModeConditions
  },
  defaultCondition: 'lightMode',
  properties: {
    outlineColor: [vars.color.light.selectable.inEdit, vars.color.dark.selectable.inEdit],
    outlineStyle: ['solid', 'dashed'],
    outlineWidth: ['thin', 'medium', 'thick']
  }
});

const outlineSprinkles = createSprinkles(outlineProperties);

export default {
  focused: outlineSprinkles({
    outlineStyle: 'dashed',
    outlineWidth: 'thin',
    outlineColor: {
      lightMode: vars.color.light.selectable.inEdit,
      darkMode: vars.color.dark.selectable.inEdit
    }
  })
    .trim()
    .split(' ')
};
