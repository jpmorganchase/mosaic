import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { darkMode, lightMode, lightModeConditions } from './lightMode';

export const linkColorProperties = defineProperties({
  conditions: {
    ...lightModeConditions,
    lightModeHover: { selector: `${lightMode} &:hover, ${lightMode} &[data-dp-hover="true"]` },
    darkModeHover: { selector: `${darkMode} &:hover, ${darkMode} &[data-dp-hover="true"]` },
    lightModeDisabled: { selector: `${lightMode} &:disabled` },
    darkModeDisabled: { selector: `${darkMode} &:disabled` }
  },
  defaultCondition: 'lightMode',
  properties: {
    color: [
      ...Object.values(vars.color.light.navigable.link),
      ...Object.values(vars.color.dark.navigable.link)
    ]
  }
});
export const linkColorSprinkles = createSprinkles(linkColorProperties);
export type LinkColorSprinkles = Parameters<typeof linkColorSprinkles>[0];

export const selectableLinkColorProperties = defineProperties({
  conditions: {
    ...lightModeConditions,
    lightModeHover: { selector: `${lightMode} &:hover, ${lightMode} &[data-dp-hover="true"]` },
    darkModeHover: { selector: `${darkMode} &:hover, ${darkMode} &[data-dp-hover="true"]` },
    lightModeSelected: { selector: `${lightMode} &[data-dp-selected="true"]` },
    darkModeSelected: { selector: `${darkMode} &[data-dp-selected="false"]` },
    lightModeDisabled: { selector: `${lightMode} &:disabled` },
    darkModeDisabled: { selector: `${darkMode} &:disabled` }
  },
  defaultCondition: 'lightMode',
  properties: {
    color: [
      vars.color.light.navigable.selectableLink.selectedLabel,
      vars.color.light.navigable.selectableLink.unselectedLabel,
      vars.color.dark.navigable.selectableLink.selectedLabel,
      vars.color.dark.navigable.selectableLink.unselectedLabel
    ],
    backgroundColor: [
      vars.color.light.neutral.background.emphasis,
      vars.color.light.navigable.selectableLink.selected,
      vars.color.light.navigable.selectableLink.hover,
      vars.color.light.navigable.selectableLink.unselected,
      vars.color.dark.neutral.background.emphasis,
      vars.color.dark.navigable.selectableLink.selected,
      vars.color.dark.navigable.selectableLink.hover,
      vars.color.dark.navigable.selectableLink.unselected
    ]
  }
});
export const selectableLinkColorSprinkles = createSprinkles(selectableLinkColorProperties);
export type SelectableLinkColorSprinkles = Parameters<typeof selectableLinkColorSprinkles>[0];

export const documentLinkColorProperties = defineProperties({
  conditions: {
    ...lightModeConditions,
    lightModeHover: { selector: `${lightMode} &:hover, ${lightMode} &[data-dp-hover="true"]` },
    darkModeHover: { selector: `${darkMode} &:hover, ${darkMode} &[data-dp-hover="true"]` },
    lightModeVisited: { selector: `${lightMode} &:visited` },
    darkModeVisited: { selector: `${darkMode} &:visited` },
    lightModeDisabled: { selector: `${lightMode} &:disabled` },
    darkModeDisabled: { selector: `${darkMode} &:disabled` }
  },
  defaultCondition: 'lightMode',
  properties: {
    color: [
      ...Object.values(vars.color.light.navigable.documentLink),
      ...Object.values(vars.color.dark.navigable.documentLink)
    ]
  }
});

export const documentLinkColorSprinkles = createSprinkles(documentLinkColorProperties);
export type DocumentLinkColorSprinkles = Parameters<typeof documentLinkColorSprinkles>[0];

export const headingLinkColorProperties = defineProperties({
  conditions: {
    ...lightModeConditions,
    lightModeHover: { selector: `${lightMode} &:hover, ${lightMode} &[data-dp-hover="true"]` },
    darkModeHover: { selector: `${darkMode} &:hover, ${darkMode} &[data-dp-hover="true"]` },
    lightModeVisited: { selector: `${lightMode} &:visited` },
    darkModeVisited: { selector: `${darkMode} &:visited` },
    lightModeDisabled: { selector: `${lightMode} &:disabled` },
    darkModeDisabled: { selector: `${darkMode} &:disabled` }
  },
  defaultCondition: 'lightMode',
  properties: {
    color: [
      ...Object.values(vars.color.light.navigable.headingLink),
      ...Object.values(vars.color.dark.navigable.headingLink)
    ]
  }
});

export const headingLinkColorSprinkles = createSprinkles(headingLinkColorProperties);
export type HeadingLinkColorSprinkles = Parameters<typeof headingLinkColorSprinkles>[0];

export const selectableLinkColor = recipe({
  variants: {
    variant: {
      selected: selectableLinkColorSprinkles({
        backgroundColor: {
          lightModeSelected: vars.color.light.navigable.selectableLink.selected,
          darkModeSelected: vars.color.dark.navigable.selectableLink.selected
        }
      }),
      selectedLabel: selectableLinkColorSprinkles({
        color: {
          lightMode: vars.color.light.navigable.selectableLink.selectedLabel,
          darkMode: vars.color.dark.navigable.selectableLink.selectedLabel
        }
      }),
      hover: selectableLinkColorSprinkles({
        backgroundColor: {
          lightModeHover: vars.color.light.navigable.selectableLink.hover,
          darkModeHover: vars.color.dark.navigable.selectableLink.hover
        }
      }),
      backgroundHover: selectableLinkColorSprinkles({
        backgroundColor: {
          lightModeHover: vars.color.light.neutral.background.emphasis,
          darkModeHover: vars.color.dark.neutral.background.emphasis
        }
      }),
      unselected: selectableLinkColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.navigable.selectableLink.unselected,
          darkMode: vars.color.dark.navigable.selectableLink.unselected
        }
      }),
      unSelectedLabel: selectableLinkColorSprinkles({
        color: {
          lightMode: vars.color.light.navigable.selectableLink.unselectedLabel,
          darkMode: vars.color.dark.navigable.selectableLink.unselectedLabel
        }
      })
    }
  }
});
export type SelectableLinkColorVariants = RecipeVariants<typeof selectableLinkColor>;
