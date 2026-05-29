'use client';

/**
 * Save-state pill — at-a-glance answer to "is my work safe?".
 *
 * Reads the FSM in `EditorContext`:
 *   clean   -> renders nothing (no claims to make about an untouched doc)
 *   dirty   -> "Edited"  (yellow / warning tone)
 *   saving  -> "Saving…" (with spinner)
 *   saved   -> "Saved <relative time>" (transitions back to clean-style
 *              after the user resumes typing, which flips state to dirty)
 *
 * Owns a single 30s ticker while in the `saved` state so the relative
 * time string ("just now" -> "1m ago" -> "5m ago") refreshes without
 * leaking timers into the rest of the editor. The ticker is teardown
 * on unmount and on state-change away from `saved`.
 */
import { useEffect, useState } from 'react';
import { Spinner } from '@salt-ds/core';

import { useSaveState } from '../EditorContext';

const REFRESH_INTERVAL_MS = 30_000;

function formatRelative(then: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const baseStyles = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  paddingInline: 10,
  paddingBlock: 4,
  borderRadius: 12,
  fontSize: 12,
  lineHeight: 1.4,
  fontWeight: 500
} as const;

export const SaveStatePill = () => {
  const { saveState, lastSavedAt } = useSaveState();
  const [now, setNow] = useState(() => Date.now());

  // Re-render every 30s while in the `saved` state so the relative
  // time stays fresh; tear the interval down for every other state so
  // we don't waste timers when nothing about the pill text changes.
  useEffect(() => {
    if (saveState !== 'saved') return;
    const id = setInterval(() => setNow(Date.now()), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [saveState]);

  if (saveState === 'clean') return null;

  if (saveState === 'dirty') {
    return (
      <div
        role="status"
        aria-live="polite"
        data-state="dirty"
        style={{
          ...baseStyles,
          background: 'var(--salt-status-warning-background, #FEF3C7)',
          color: 'var(--salt-status-warning-foreground, #92400E)'
        }}
      >
        <span aria-hidden>●</span>
        <span>Edited</span>
      </div>
    );
  }

  if (saveState === 'saving') {
    return (
      <div
        role="status"
        aria-live="polite"
        data-state="saving"
        style={{
          ...baseStyles,
          background: 'var(--salt-status-info-background, #DBEAFE)',
          color: 'var(--salt-status-info-foreground, #1E3A8A)'
        }}
      >
        <Spinner size="small" />
        <span>Saving…</span>
      </div>
    );
  }

  // saved
  const relative = lastSavedAt ? formatRelative(lastSavedAt, now) : 'just now';
  return (
    <div
      role="status"
      aria-live="polite"
      data-state="saved"
      style={{
        ...baseStyles,
        background: 'var(--salt-status-success-background, #D1FAE5)',
        color: 'var(--salt-status-success-foreground, #065F46)'
      }}
    >
      <span aria-hidden>✓</span>
      <span>Saved {relative}</span>
    </div>
  );
};

