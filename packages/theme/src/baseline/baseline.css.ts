import { globalStyle } from '@vanilla-extract/css';
import { config } from '../config';

globalStyle('html, body', {
  fontFamily: 'Open Sans',
  margin: 0,
  padding: 0,
  height: '100%'
});

globalStyle('body', {
  minHeight: '100%'
});

globalStyle('*', {
  boxSizing: 'border-box'
});

globalStyle('p,h1, h2, h3, h4, h5, h6, ul, ol, li, pre, figure', {
  margin: 0,
  fontFamily: 'inherit'
});

globalStyle('a', {
  color: 'inherit',
  textDecoration: 'none'
});
globalStyle('a:hover', {
  color: 'inherit'
});

globalStyle('table', {
  border: 'none'
});

globalStyle('h1, h2, h3, h4, h5, h6', {
  margin: 0
});

globalStyle('li > p', {
  display: 'inline'
});

globalStyle(`.${config.ssrClassName} svg, .${config.ssrClassName} img`, {
  display: 'none'
});
