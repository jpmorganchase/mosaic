'use client';

/**
 * Phase 10 — "Visual / Source" toolbar toggle.
 *
 * Salt's `ToggleButtonGroup` gives us a segmented control with the
 * right keyboard semantics (left/right arrow to move between
 * options, space/enter to select) and a single accessible name we
 * can apply to the group. Anchored on the right of the toolbar
 * next to the `Cancel` action so the mode switcher sits with the
 * other "what is this editor doing right now" affordances rather
 * than buried with the formatting tooltrays.
 *
 * The values `wysiwyg` and `source` match the URL parameter
 * exactly so the wiring is zero-ceremony — no enum mapping, the
 * `value` IS what gets written to `?mode=`. (`'wysiwyg'` rather
 * than `'visual'` because the URL parameter and the type are the
 * same vocabulary and we already use `wysiwyg` in
 * `useEditorMode`.)
 *
 * Click flow
 * ----------
 * Switching modes has to happen in a specific order:
 *
 *   1. `prepareModeFlip(next)` — synchronous capture of the
 *      OUTGOING mode's markdown + caret. Runs while the outgoing
 *      surface is still mounted.
 *   2. `setMode(next)` — writes `?mode=` into the URL via
 *      `router.replace`, which triggers a re-render and unmounts
 *      the outgoing surface.
 *
 * Doing them in the reverse order would leave the bridge ref
 * empty (the outgoing surface is gone by the time we'd capture)
 * so the new mode would seed itself with the on-disk content
 * instead of the user's in-progress edits — a silent data-loss
 * bug. The bridge context is `null`-tolerant so this component
 * also works in any future host that mounts the toolbar without
 * the bridge.
 */

import type { SyntheticEvent } from 'react';
import { ToggleButton, ToggleButtonGroup } from '@salt-ds/core';

import { useEditorMode, type EditorMode } from '../../useEditorMode';
import { useModeBridge } from '../ModeBridgeContext';

export const ModeToggle = () => {
  const { mode, setMode } = useEditorMode();
  const bridge = useModeBridge();

  // Salt's onChange signature is `(event)` (no value arg), so we
  // pull the new value off the event target's `value` prop —
  // matches the pattern Salt's own ToggleButtonGroup examples
  // demonstrate and avoids guessing at undocumented signatures.
  const onChange = (event: SyntheticEvent<HTMLButtonElement>) => {
    const next = event.currentTarget.value as EditorMode;
    if (next === mode) return;
    bridge?.prepareModeFlip(next);
    setMode(next);
  };

  return (
    <ToggleButtonGroup aria-label="Editor view mode" value={mode} onChange={onChange}>
      <ToggleButton value="wysiwyg" aria-label="Visual editor (WYSIWYG)">
        Visual
      </ToggleButton>
      <ToggleButton value="source" aria-label="Source editor (raw markdown)">
        Source
      </ToggleButton>
    </ToggleButtonGroup>
  );
};
