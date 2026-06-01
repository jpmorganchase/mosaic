import { style } from '@vanilla-extract/css';

/**
 * Layout for `NewPageDialog`: three stacked Salt `FormField`s
 * (parent folder, filename, title) and a URL preview row,
 * separated by `--salt-spacing-200` to match the visual rhythm
 * of `PersistEditDialog/index.css.ts`.
 *
 * Label / helper-text / validation-status styling lives in
 * Salt's `FormField` family — this module no longer ships its
 * own variants for those, so removing a style here is the right
 * place to start if you spot a visual inconsistency.
 */
export default {
  fieldRow: style({
    marginBottom: 'var(--salt-spacing-200)'
  }),
  previewRow: style({
    backgroundColor: 'var(--salt-container-secondary-background, #f4f6f8)',
    borderRadius: '4px',
    fontFamily: 'var(--salt-text-fontFamily-code, monospace)',
    marginBottom: 'var(--salt-spacing-200)',
    padding: 'var(--salt-spacing-100)'
  })
};
