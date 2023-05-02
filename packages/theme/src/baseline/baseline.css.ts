import { globalStyle } from '@vanilla-extract/css';
import { ssrClassName } from '../index';

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

globalStyle('p,h1, h2, h3, h4, h5, h6, ul, ol, li, pre', {
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

globalStyle('.dark main img:not(.no-filter)', {
  filter: 'invert(80%)'
});

globalStyle('h1, h2, h3, h4, h5, h6', {
  margin: 0
});

globalStyle('li > p', {
  display: 'inline'
});

globalStyle(`.${ssrClassName} svg, .${ssrClassName} img`, {
  display: 'none'
});
