import { style } from '@vanilla-extract/css';
import { animation, backgroundColor, config, paragraph } from '@jpmorganchase/mosaic-theme';

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
    background: 'inherit !important',
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
  closeButton: style({
    selectors: {
      ['button.&']: {
        position: 'absolute',
        width: `${config.appHeader.height}px`,
        height: `${config.appHeader.height}px`
      }
    }
  }),
  leftCloseButton: style({
    right: '0px'
  }),
  rightCloseButton: style({
    left: '0px'
  }),
  openLeft: animation({ variant: 'leftSlideIn' }),
  closeLeft: animation({ variant: 'leftSlideOut' }),
  openRight: animation({ variant: 'rightSlideIn' }),
  closeRight: animation({ variant: 'rightSlideOut' })
};
