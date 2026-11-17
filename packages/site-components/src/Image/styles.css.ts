import { style } from '@vanilla-extract/css';

export default {
  img: style({
    maxWidth: '100%'
  }),
  root: style({
    display: 'block',
    position: 'relative'
  }),
  nextImage: style({
    objectFit: 'scale-down'
  })
};
