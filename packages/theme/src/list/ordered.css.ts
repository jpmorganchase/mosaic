import { style } from '@vanilla-extract/css';

import { vars } from '../vars.css';

export const orderedList = style({
  paddingLeft: '1em',
  marginLeft: vars.space.horizontal.x2,
  marginRight: vars.space.horizontal.x4,
  selectors: {
    '&': { marginTop: vars.space.vertical.x4 },
    '& &': { marginTop: vars.space.vertical.x2, marginLeft: vars.space.horizontal.none },
    '& & &': {
      marginTop: vars.space.vertical.x2,
      marginLeft: vars.space.horizontal.none
    },
    '&:last-of-type': {
      marginBottom: vars.space.vertical.x2
    }
  }
});

export const orderedListItem = style({
  listStyleType: 'decimal',
  paddingLeft: vars.space.horizontal.x4,
  selectors: {
    '& &': {
      listStyleType: 'lower-alpha'
    },
    '& & &': {
      listStyleType: 'lower-roman'
    }
  }
});
