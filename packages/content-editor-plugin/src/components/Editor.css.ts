import { globalStyle, style } from '@vanilla-extract/css';
import {
  vars,
  backgroundColor,
  neutralBorder,
  navigableBorder,
  config
} from '@jpmorganchase/mosaic-theme';

globalStyle('div[contenteditable]', {
  outline: 'none'
});

export default {
  root: style({
    display: 'grid',
    gridTemplateColumns: '1fr',
    gridTemplateRows: 'auto 1fr',
    gridTemplateAreas: '"toolbar" "editor" '
  }),
  toolbarContainer: style([
    style({
      gridArea: 'toolbar',
      position: 'sticky',
      top: `${config.appHeader.height}px`,
      zIndex: 2
    }),
    neutralBorder({
      variant: 'low',
      borderWidth: 'thin'
    })
  ]),
  editorRoot: style({
    display: 'flex',
    marginTop: vars.space.vertical.x3,
    flexWrap: 'wrap',
    gridArea: 'editor'
  }),
  splitter: style({
    display: 'flex',
    flexDirection: 'row'
  }),
  gutter: style([
    {
      backgroundRepeat: 'no-repeat',
      backgroundPosition: '50%',
      backgroundImage:
        'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==")',
      cursor: 'col-resize'
    },
    backgroundColor({ variant: 'emphasis' })
  ]),
  unfocused: neutralBorder({
    variant: 'low',
    borderTopWidth: 'thin',
    borderLeftWidth: 'thin',
    borderRightWidth: 'thin',
    borderBottomWidth: 'none'
  }),
  focused: navigableBorder({
    variant: 'focusRing',
    borderWidth: 'medium'
  })
};
