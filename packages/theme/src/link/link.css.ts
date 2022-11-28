import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { responsiveSprinkles } from '../responsive';
import {
  documentLinkColorSprinkles,
  headingLinkColorSprinkles,
  linkColorSprinkles,
  selectableLinkColorSprinkles
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
        linkColorSprinkles({
          color: {
            lightMode: vars.color.light.navigable.link.regular,
            lightModeHover: vars.color.light.navigable.link.hover,
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
        documentLinkColorSprinkles({
          color: {
            lightMode: vars.color.light.navigable.documentLink.regular,
            lightModeHover: vars.color.light.navigable.documentLink.hover,
            lightModeVisited: vars.color.light.navigable.documentLink.visited,
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
        headingLinkColorSprinkles({
          color: {
            lightMode: vars.color.light.navigable.headingLink.regular,
            lightModeHover: vars.color.light.navigable.headingLink.hover,
            lightModeVisited: vars.color.light.navigable.headingLink.visited,
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
        selectableLinkColorSprinkles({
          backgroundColor: {
            lightModeHover: vars.color.light.neutral.background.emphasis,
            darkModeHover: vars.color.dark.neutral.background.emphasis
          },
          color: {
            lightMode: vars.color.light.navigable.selectableLink.unselectedLabel,
            lightModeSelected: vars.color.light.navigable.selectableLink.selectedLabel,
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
