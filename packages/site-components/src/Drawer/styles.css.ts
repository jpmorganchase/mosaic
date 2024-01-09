import { style } from '@vanilla-extract/css';
import { animation, backgroundColor, button, paragraph } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    {
      position: 'absolute',
      zIndex: 20000
    },
    backgroundColor({ variant: 'regular' }),
    paragraph({ variant: 'paragraph2' })
  ]),
  layerLayout: style({
    padding: '0px',
    margin: '0px'
  }),
  left: style({
    left: '0px',
    right: 'unset'
  }),
  right: style({
    left: 'unset',
    right: '0px'
  }),
  closeButton: style([
    {
      selectors: {
        ['.saltButton.&']: {
          position: 'absolute',
          top: '10px'
        }
      }
    },
    button({ variant: 'square' })
  ]),
  leftCloseButton: style({
    right: '10px'
  }),
  rightCloseButton: style({
    left: '10px'
  }),
  openLeft: animation({ variant: 'leftSlideIn' }),
  closeLeft: animation({ variant: 'leftSlideOut' }),
  openRight: animation({ variant: 'rightSlideIn' }),
  closeRight: animation({ variant: 'rightSlideOut' })
};
