import { style } from '@vanilla-extract/css';
import { sidebar } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    {
      zIndex: 3
    },
    sidebar.container
  ]),
  scrollable: sidebar.scrollable
};
