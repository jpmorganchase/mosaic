import { createTheme, createThemeContract } from '@vanilla-extract/css';

import { borderVars } from './border/vars.css';
import { colorVars } from './color/vars.css';
import { buttonVars } from './button/vars.css';
import { componentExampleVars } from './componentExample/vars.css';
import { fontSizeVars, fontWeightVars } from './typography/vars.css';
import { gridVars } from './grid/vars.css';
import { heroVars } from './hero/vars.css';
import { impactVars } from './impact/vars.css';
import { listVars } from './list/vars.css';
import { opacityVars } from './opacity/vars.css';
import { shadowVars } from './shadow/vars.css';
import { spaceVars } from './responsive/vars.css';
import { tableVars } from './table/vars.css';

const vars = createThemeContract({
  border: borderVars,
  color: colorVars,
  component: {
    button: buttonVars,
    componentExample: componentExampleVars,
    grid: gridVars,
    hero: heroVars,
    impact: impactVars,
    list: listVars,
    table: tableVars
  },
  fontSize: fontSizeVars,
  fontWeight: fontWeightVars,
  opacity: opacityVars,
  shadow: shadowVars,
  space: spaceVars
});

const themeClassName = createTheme(vars, {
  border: borderVars,
  color: colorVars,
  component: {
    button: buttonVars,
    componentExample: componentExampleVars,
    grid: gridVars,
    hero: heroVars,
    impact: impactVars,
    list: listVars,
    table: tableVars
  },
  fontSize: fontSizeVars,
  fontWeight: fontWeightVars,
  opacity: opacityVars,
  shadow: shadowVars,
  space: spaceVars
});

export { themeClassName, vars };
