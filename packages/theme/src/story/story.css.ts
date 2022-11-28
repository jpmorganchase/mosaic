import { styleVariants } from '@vanilla-extract/css';

import { responsiveSprinkles } from '../responsive';
import { heading, paragraph, subtitle } from '../typography';
import { borderSprinkles } from '../border';
import { vars } from '../vars.css';

export const story = styleVariants({
  primaryHeading: [heading({ variant: 'heading2' })],
  secondaryHeading: [
    {
      borderWidth: '0px',
      borderStyle: 'solid'
    },
    borderSprinkles({
      borderStyle: 'solid',
      borderColor: {
        lightMode: vars.color.light.navigable.selectableLink.selected,
        darkMode: vars.color.dark.navigable.selectableLink.selected
      },
      borderLeftWidth: 'thick'
    }),
    heading({ variant: 'heading5' })
  ],
  primarySubtitle: [
    paragraph({ variant: 'paragraph1' }),
    responsiveSprinkles({ marginTop: ['x8', 'x8', 'x8', 'x8'] })
  ],
  secondarySubtitle: [
    subtitle({ variant: 'subtitle6' }),
    responsiveSprinkles({ marginTop: ['x6', 'x6', 'x6', 'x6'] })
  ]
});
