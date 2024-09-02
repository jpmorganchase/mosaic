import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import {
  darkMode,
  lightMode,
  lightModeInteractiveCondition,
  darkModeInteractiveCondition
} from './modes';

export const lightLinkColorProperties = defineProperties({
  conditions: lightModeInteractiveCondition,
  defaultCondition: 'lightMode',
  properties: {
    color: [...Object.values(vars.color.light.navigable.link)]
  }
});
export const lightLinkColorSprinkles = createSprinkles(lightLinkColorProperties);
export type LightLinkColorSprinkles = Parameters<typeof lightLinkColorSprinkles>[0];

export const darkLinkColorProperties = defineProperties({
  conditions: darkModeInteractiveCondition,
  defaultCondition: 'darkMode',
  properties: {
    color: [...Object.values(vars.color.dark.navigable.link)]
  }
});
export const darkLinkColorSprinkles = createSprinkles(darkLinkColorProperties);
export type DarkLinkColorSprinkles = Parameters<typeof darkLinkColorSprinkles>[0];

export const lightSelectableLinkColorProperties = defineProperties({
  conditions: {
    ...lightModeInteractiveCondition,
    lightModeSelected: { selector: `${lightMode} &[data-dp-selected="true"]` }
  },
  defaultCondition: 'lightMode',
  properties: {
    color: [
      vars.color.light.navigable.selectableLink.selectedLabel,
      vars.color.light.navigable.selectableLink.unselectedLabel
    ],
    backgroundColor: [
      vars.color.light.neutral.background.emphasis,
      vars.color.light.navigable.selectableLink.selected,
      vars.color.light.navigable.selectableLink.hover,
      vars.color.light.navigable.selectableLink.unselected
    ]
  }
});
export const lightSelectableLinkColorSprinkles = createSprinkles(
  lightSelectableLinkColorProperties
);
export type LightSelectableLinkColorSprinkles = Parameters<
  typeof lightSelectableLinkColorSprinkles
>[0];

export const darkSelectableLinkColorProperties = defineProperties({
  conditions: {
    ...darkModeInteractiveCondition,
    darkModeSelected: { selector: `${darkMode} &[data-dp-selected="true"]` }
  },
  defaultCondition: 'darkMode',
  properties: {
    color: [
      vars.color.dark.navigable.selectableLink.selectedLabel,
      vars.color.dark.navigable.selectableLink.unselectedLabel
    ],
    backgroundColor: [
      vars.color.dark.neutral.background.emphasis,
      vars.color.dark.navigable.selectableLink.selected,
      vars.color.dark.navigable.selectableLink.hover,
      vars.color.dark.navigable.selectableLink.unselected
    ]
  }
});
export const darkSelectableLinkColorSprinkles = createSprinkles(darkSelectableLinkColorProperties);
export type DarkSelectableLinkColorSprinkles = Parameters<
  typeof darkSelectableLinkColorSprinkles
>[0];

export const lightDocumentLinkColorProperties = defineProperties({
  conditions: {
    ...lightModeInteractiveCondition,
    lightModeVisited: { selector: `${lightMode} &:visited` }
  },
  defaultCondition: 'lightMode',
  properties: {
    color: [...Object.values(vars.color.light.navigable.documentLink)]
  }
});

export const lightDocumentLinkColorSprinkles = createSprinkles(lightDocumentLinkColorProperties);
export type LightDocumentLinkColorSprinkles = Parameters<typeof lightDocumentLinkColorSprinkles>[0];

export const darkDocumentLinkColorProperties = defineProperties({
  conditions: {
    ...darkModeInteractiveCondition,
    darkModeVisited: { selector: `${darkMode} &:visited` }
  },
  defaultCondition: 'darkMode',
  properties: {
    color: [...Object.values(vars.color.dark.navigable.documentLink)]
  }
});

export const darkDocumentLinkColorSprinkles = createSprinkles(darkDocumentLinkColorProperties);
export type DarkDocumentLinkColorSprinkles = Parameters<typeof darkDocumentLinkColorSprinkles>[0];

export const lightHeadingLinkColorProperties = defineProperties({
  conditions: {
    ...lightModeInteractiveCondition,
    lightModeVisited: { selector: `${lightMode} &:visited` }
  },
  defaultCondition: 'lightMode',
  properties: {
    color: [...Object.values(vars.color.light.navigable.headingLink)]
  }
});

export const lightHeadingLinkColorSprinkles = createSprinkles(lightHeadingLinkColorProperties);
export type LightHeadingLinkColorSprinkles = Parameters<typeof lightHeadingLinkColorSprinkles>[0];

export const darkHeadingLinkColorProperties = defineProperties({
  conditions: {
    ...darkModeInteractiveCondition,
    darkModeVisited: { selector: `${darkMode} &:visited` }
  },
  defaultCondition: false,
  properties: {
    color: [...Object.values(vars.color.dark.navigable.headingLink)]
  }
});

export const darkHeadingLinkColorSprinkles = createSprinkles(darkHeadingLinkColorProperties);
export type DarkHeadingLinkColorSprinkles = Parameters<typeof darkHeadingLinkColorSprinkles>[0];

export const lightSelectableLinkColor = recipe({
  variants: {
    variant: {
      selected: lightSelectableLinkColorSprinkles({
        backgroundColor: {
          lightModeSelected: vars.color.light.navigable.selectableLink.selected
        }
      }),
      selectedLabel: lightSelectableLinkColorSprinkles({
        color: {
          lightMode: vars.color.light.navigable.selectableLink.selectedLabel
        }
      }),
      hover: lightSelectableLinkColorSprinkles({
        backgroundColor: {
          lightModeHover: vars.color.light.navigable.selectableLink.hover
        }
      }),
      backgroundHover: lightSelectableLinkColorSprinkles({
        backgroundColor: {
          lightModeHover: vars.color.light.neutral.background.emphasis
        }
      }),
      unselected: lightSelectableLinkColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.navigable.selectableLink.unselected
        }
      }),
      unSelectedLabel: lightSelectableLinkColorSprinkles({
        color: {
          lightMode: vars.color.light.navigable.selectableLink.unselectedLabel
        }
      })
    }
  }
});
export type LightSelectableLinkColorVariants = RecipeVariants<typeof lightSelectableLinkColor>;

export const darkSelectableLinkColor = recipe({
  variants: {
    variant: {
      selected: darkSelectableLinkColorSprinkles({
        backgroundColor: {
          darkModeSelected: vars.color.dark.navigable.selectableLink.selected
        }
      }),
      selectedLabel: darkSelectableLinkColorSprinkles({
        color: {
          darkMode: vars.color.dark.navigable.selectableLink.selectedLabel
        }
      }),
      hover: darkSelectableLinkColorSprinkles({
        backgroundColor: {
          darkModeHover: vars.color.dark.navigable.selectableLink.hover
        }
      }),
      backgroundHover: darkSelectableLinkColorSprinkles({
        backgroundColor: {
          darkModeHover: vars.color.dark.neutral.background.emphasis
        }
      }),
      unselected: darkSelectableLinkColorSprinkles({
        backgroundColor: {
          darkMode: vars.color.dark.navigable.selectableLink.unselected
        }
      }),
      unSelectedLabel: darkSelectableLinkColorSprinkles({
        color: {
          darkMode: vars.color.dark.navigable.selectableLink.unselectedLabel
        }
      })
    }
  }
});
export type DarkSelectableLinkColorVariants = RecipeVariants<typeof darkSelectableLinkColor>;
