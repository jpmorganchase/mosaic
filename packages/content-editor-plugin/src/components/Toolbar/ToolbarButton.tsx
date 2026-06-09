import { forwardRef, Ref } from 'react';
import classnames from 'clsx';
import { Button, type ButtonProps, Label } from '@jpmorganchase/mosaic-components';

import { ariaKeyshortcuts, formatShortcut } from '../../utils/shortcuts';

export interface ToolbarButtonProps extends ButtonProps {
  active?: boolean;
  label?: string;
  disableTooltip?: boolean;
  /**
   * Canonical key combo (e.g. `"Mod+B"`). When present:
   *   - the tooltip displays the platform-formatted glyphs next to
   *     the label (`Bold ⌘B` on mac, `Bold Ctrl+B` elsewhere);
   *   - `aria-keyshortcuts` is set so screen readers announce it;
   *   - the tooltip is force-enabled, since a shortcut-less button
   *     with a label was opting out of the default tooltip
   *     intentionally, but a shortcut hint is the whole point.
   * Note: this prop is presentational only — actually wiring the
   * keystroke to an action happens in `KeyboardShortcutsPlugin` (or,
   * for built-ins like Bold/Italic, inside Lexical itself).
   */
  shortcut?: string;
}

export const ToolbarButton = forwardRef(
  (
    {
      active,
      className,
      onClick,
      children,
      label,
      disabled,
      disableTooltip = disabled,
      shortcut,
      ...rest
    }: ToolbarButtonProps,
    ref: Ref<HTMLButtonElement>
  ) => {
    // Tooltip title: keep the original label as the primary content
    // and append the formatted shortcut after a thin space. A single
    // string keeps `<Label tooltip>` working without bespoke
    // TooltipContent JSX (which would force us to fork the component
    // markup just for this one decoration).
    const tooltipTitle = shortcut && label ? `${label}  ${formatShortcut(shortcut)}` : label;
    return (
      <Label tooltip={!disableTooltip} TooltipProps={{ title: tooltipTitle, placement: 'bottom' }}>
        <Button
          aria-label={label}
          aria-keyshortcuts={shortcut ? ariaKeyshortcuts(shortcut) : undefined}
          ref={ref}
          onClick={onClick}
          className={classnames(className)}
          variant={active ? 'regular' : 'secondary'}
          disabled={disabled}
          {...rest}
        >
          {children}
        </Button>
      </Label>
    );
  }
);
