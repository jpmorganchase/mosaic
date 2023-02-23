import { style } from '@vanilla-extract/css';
import { sidebar } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    {
      width: '400px',
      zIndex: 3
    },
    sidebar.container
  ]),
  scrollable: sidebar.scrollable,
  sticky: sidebar.sticky
};
