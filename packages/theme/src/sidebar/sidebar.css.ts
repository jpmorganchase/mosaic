import { styleVariants } from '@vanilla-extract/css';
import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';

import { config } from '../config';
import { responsiveConditions, responsiveSprinkles } from '../responsive/responsive.css';

export const sidebarProperties = defineProperties({
  conditions: responsiveConditions,
  defaultCondition: 'mobile',
  responsiveArray: ['mobile', 'tablet', 'web', 'desktop'],
  properties: {
    display: ['block', 'none'],
    width: { none: '0px', wide: '40%', narrow: '23%', drawer: '100vw' }
  }
});

export const sidebarSprinkles = createSprinkles(sidebarProperties);
export type SidebarSprinkles = Parameters<typeof sidebarSprinkles>[0];

export const sidebar = styleVariants({
  container: [
    {
      bottom: 0,
      position: 'relative',
      height: 'auto'
    },
    responsiveSprinkles({
      marginRight: ['none', 'none', 'none', 'none'],
      marginLeft: ['none', 'none', 'none', 'none'],
      marginTop: ['x4', 'x4', 'x4', 'x4'],
      paddingTop: ['x1', 'x1', 'x1', 'x1'],
      paddingBottom: ['none', 'none', 'none', 'none']
    }),
    sidebarSprinkles({
      width: ['drawer', 'drawer', 'wide', 'wide']
    })
  ],
  scrollable: {
    display: 'flex',
    overflowY: 'scroll',
    top: `${config.appHeader.height}px`
  },
  sticky: {
    top: `calc(${config.appHeader.height}px + var(--space-vertical-x20))`,
    position: 'sticky'
  }
});
