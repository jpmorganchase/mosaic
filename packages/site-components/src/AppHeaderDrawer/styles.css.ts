import { style } from '@vanilla-extract/css';
import { config } from '@jpmorganchase/mosaic-theme';

export default {
  toggleButton: style({
    selectors: {
      ['button.&']: {
        padding: '0px',
        boxSizing: 'content-box',
        width: `${config.appHeader.height}px`,
        height: `${config.appHeader.height}px`
      }
    }
  })
};
