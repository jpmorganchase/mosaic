import { style } from '@vanilla-extract/css';
import { sidebar } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    {
      zIndex: 3,
      flexGrow: 0,
      width: '300px'
    },
    sidebar.container
  ]),
  scrollable: sidebar.scrollable
};
