import { style, globalStyle } from '@vanilla-extract/css';
const triggerRoot = style({ display: 'inline-flex', alignItems: 'center' });

export default {
  root: style({
    display: 'flex !important',
    alignSelf: 'stretch',
    alignItems: 'center'
  }),
  triggerRoot
};

globalStyle(`${triggerRoot} svg.saltIcon`, {
  vars: { '--saltIcon-size-multiplier': '1.2!important' }
});
