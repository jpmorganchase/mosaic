import { globalStyle } from '@vanilla-extract/css';
import { spaceVars } from '../responsive/vars.css';

globalStyle('pre', {
  overflowX: 'auto',
  padding: `${spaceVars.vertical.x2} ${spaceVars.horizontal.none}`
});

globalStyle('pre [data-line]', {
  overflowX: 'auto'
});
