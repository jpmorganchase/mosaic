import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { darkMode, lightMode, lightModeConditions } from './lightMode';

export const selectableColorProperties = defineProperties({
  conditions: {
    ...lightModeConditions,
    lightModeHover: { selector: `${lightMode} &:hover` },
    darkModeHover: { selector: `${darkMode} &:hover` },
    lightModeSelected: { selector: `${lightMode} &[data-dp-selected="true"]` },
    darkModeSelected: { selector: `${darkMode} &[data-dp-selected="false"]` },
    lightModeDisabled: { selector: `${lightMode} &:disabled` },
    darkModeDisabled: { selector: `${darkMode} &:disabled` }
  },
  defaultCondition: 'lightMode',
  properties: {
    color: [
      vars.color.light.selectable.selectedLabel,
      vars.color.light.selectable.hoverLabel,
      vars.color.light.selectable.unselectedLabel,
      vars.color.light.selectable.disabledLabel,
      vars.color.dark.selectable.selectedLabel,
      vars.color.dark.selectable.hoverLabel,
      vars.color.dark.selectable.unselectedLabel,
      vars.color.dark.selectable.disabledLabel
    ],
    backgroundColor: [
      vars.color.light.selectable.inEdit,
      vars.color.light.selectable.hover,
      vars.color.dark.selectable.inEdit,
      vars.color.dark.selectable.hover
    ]
  }
});
export const selectableColorSprinkles = createSprinkles(selectableColorProperties);
export type SelectableColorSprinkles = Parameters<typeof selectableColorSprinkles>[0];

export const selectableColor = recipe({
  variants: {
    variant: {
      inEdit: selectableColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.selectable.inEdit,
          darkMode: vars.color.dark.selectable.inEdit
        }
      }),
      hover: selectableColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.selectable.hover,
          darkMode: vars.color.dark.selectable.hover
        }
      }),
      selectedLabel: selectableColorSprinkles({
        color: {
          lightMode: vars.color.light.selectable.selectedLabel,
          darkMode: vars.color.dark.selectable.selectedLabel
        }
      }),
      hoverLabel: selectableColorSprinkles({
        color: {
          lightMode: vars.color.light.selectable.hoverLabel,
          darkMode: vars.color.dark.selectable.hoverLabel
        }
      }),
      unSelectedLabel: selectableColorSprinkles({
        color: {
          lightMode: vars.color.light.selectable.unselectedLabel,
          darkMode: vars.color.dark.selectable.unselectedLabel
        }
      }),
      disabled: selectableColorSprinkles({
        color: {
          lightMode: vars.color.light.selectable.disabledLabel,
          darkMode: vars.color.dark.selectable.disabledLabel
        }
      })
    }
  }
});
export type SelectableColorVariants = RecipeVariants<typeof selectableColor>;
