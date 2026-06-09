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

// Applied imperatively by ErrorHighlightPlugin to the Lexical block
// whose markdown line matches the current compile error. Uses a
// globalStyle (not a vanilla-extract scoped class) because the class
// is added directly to a Lexical-owned DOM element rather than a JSX
// element under our control. Keep the class name in sync with
// ERROR_CLASS in plugins/ErrorHighlightPlugin.tsx.
globalStyle('.mosaic-editor-error-line', {
  position: 'relative',
  // A wavy underline tracks each character without forcing layout —
  // text-decoration-line is preferred over a border-bottom because the
  // latter would shift adjacent content by a pixel and cause visible
  // jitter as the error appears / disappears.
  textDecorationLine: 'underline',
  textDecorationStyle: 'wavy',
  textDecorationColor: 'var(--salt-status-error-foreground-informative)',
  textDecorationThickness: 'var(--salt-size-fixed-200)',
  // A faint tinted background helps the eye locate the block when the
  // underline alone is hidden by long content, without obscuring the
  // text colour.
  backgroundColor: 'var(--salt-status-error-background)',
  borderRadius: 'var(--salt-palette-corner-weaker)'
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
      zIndex: 2,
      borderRadius: 'var(--salt-palette-corner)',
      overflow: 'hidden'
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
  // CSS-only 50/50 fallback used during the one paint frame before
  // `<Split>` mounts. Mirrors the steady-state geometry react-split
  // produces (two equal flex children, row direction) so the
  // upgrade is visually seamless. No gutter — the brief
  // intermediate frame doesn't need to be interactive.
  splitterFallback: style({
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    height: '100%'
  }),
  splitterFallbackPane: style({
    flex: '1 1 50%',
    minWidth: 0,
    overflow: 'auto'
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
