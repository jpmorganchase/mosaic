import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { responsiveSprinkles } from '../responsive';
import {
  lightDocumentLinkColorSprinkles,
  darkDocumentLinkColorSprinkles,
  lightHeadingLinkColorSprinkles,
  darkHeadingLinkColorSprinkles,
  lightLinkColorSprinkles,
  darkLinkColorSprinkles,
  lightSelectableLinkColorSprinkles,
  darkSelectableLinkColorSprinkles
} from '../color';
import { textDecorationSprinkles } from '../typography';

export const link = recipe({
  variants: {
    context: {
      component: responsiveSprinkles({
        marginTop: ['none', 'none', 'none', 'none']
      }),
      markdown: responsiveSprinkles({ marginTop: ['x4', 'x4', 'x4', 'x4'] })
    },
    variant: {
      regular: [
        textDecorationSprinkles({
          textDecoration: {
            regular: 'underline',
            hover: 'none'
          }
        }),
        lightLinkColorSprinkles({
          color: {
            lightMode: vars.color.light.navigable.link.regular,
            lightModeHover: vars.color.light.navigable.link.hover
          }
        }),
        darkLinkColorSprinkles({
          color: {
            darkMode: vars.color.dark.navigable.link.regular,
            darkModeHover: vars.color.dark.navigable.link.hover
          }
        })
      ],
      document: [
        textDecorationSprinkles({
          textDecoration: {
            regular: 'underline',
            hover: 'none'
          }
        }),
        lightDocumentLinkColorSprinkles({
          color: {
            lightMode: vars.color.light.navigable.documentLink.regular,
            lightModeHover: vars.color.light.navigable.documentLink.hover,
            lightModeVisited: vars.color.light.navigable.documentLink.visited
          }
        }),
        darkDocumentLinkColorSprinkles({
          color: {
            darkMode: vars.color.dark.navigable.documentLink.regular,
            darkModeHover: vars.color.dark.navigable.documentLink.hover,
            darkModeVisited: vars.color.dark.navigable.documentLink.visited
          }
        })
      ],
      heading: [
        textDecorationSprinkles({
          textDecoration: {
            regular: 'none'
          }
        }),
        lightHeadingLinkColorSprinkles({
          color: {
            lightMode: vars.color.light.navigable.headingLink.regular,
            lightModeHover: vars.color.light.navigable.headingLink.hover,
            lightModeVisited: vars.color.light.navigable.headingLink.visited
          }
        }),
        darkHeadingLinkColorSprinkles({
          color: {
            darkMode: vars.color.dark.navigable.headingLink.regular,
            darkModeHover: vars.color.dark.navigable.headingLink.hover,
            darkModeVisited: vars.color.dark.navigable.headingLink.visited
          }
        })
      ],
      selectable: [
        textDecorationSprinkles({
          textDecoration: {
            regular: 'none',
            hover: 'none'
          }
        }),
        lightSelectableLinkColorSprinkles({
          backgroundColor: {
            lightModeHover: vars.color.light.neutral.background.emphasis
          },
          color: {
            lightMode: vars.color.light.navigable.selectableLink.unselectedLabel,
            lightModeSelected: vars.color.light.navigable.selectableLink.selectedLabel
          }
        }),
        darkSelectableLinkColorSprinkles({
          backgroundColor: {
            darkModeHover: vars.color.dark.neutral.background.emphasis
          },
          color: {
            darkMode: vars.color.dark.navigable.selectableLink.unselectedLabel,
            darkModeSelected: vars.color.dark.navigable.selectableLink.selectedLabel
          }
        })
      ]
    }
  },
  defaultVariants: {
    context: 'component',
    variant: 'regular'
  }
});
export type LinkVariants = RecipeVariants<typeof link>;
