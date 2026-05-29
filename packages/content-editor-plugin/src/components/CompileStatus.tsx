'use client';

/**
 * Inline toolbar pill that surfaces when the preview Server Action is
 * in flight. Driven by the `isCompiling` slice that `PreviewPlugin`
 * flips synchronously around its `startTransition` so the spinner
 * appears immediately on keystroke rather than lagging behind
 * useTransition's non-urgent pending state.
 *
 * Renders nothing when idle so it doesn't reserve toolbar real estate
 * — the most common state for a settled editor.
 */
import { Spinner } from '@salt-ds/core';

import { useIsCompiling } from '../EditorContext';

const styles = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  paddingInline: 8,
  fontSize: 12,
  color: 'var(--salt-content-secondary-foreground)'
} as const;

export const CompileStatus = () => {
  const isCompiling = useIsCompiling();
  if (!isCompiling) return null;
  return (
    <div role="status" aria-live="polite" aria-label="Compiling preview" style={styles}>
      <Spinner size="small" />
      <span>Compiling…</span>
    </div>
  );
};

