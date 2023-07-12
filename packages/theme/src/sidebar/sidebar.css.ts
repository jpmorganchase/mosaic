import { styleVariants } from '@vanilla-extract/css';

import { config } from '../config';
import { responsiveSprinkles } from '../responsive/responsive.css';

export const sidebar = styleVariants({
  container: [
    {
      height: 'auto'
    },
    responsiveSprinkles({
      marginRight: ['none', 'none', 'none', 'none'],
      marginLeft: ['none', 'none', 'none', 'none'],
      marginTop: ['x4', 'x4', 'x4', 'x4'],
      paddingTop: ['x1', 'x1', 'x1', 'x1'],
      paddingBottom: ['none', 'none', 'none', 'none']
    })
  ],
  scrollable: {
    display: 'flex',
    overflowY: 'auto',
    top: `${config.appHeader.height}px`
  }
});
