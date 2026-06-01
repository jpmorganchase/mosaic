'use client';

/**
 * Confirm-on-leave for unsaved editor changes.
 *
 * Three navigation channels can drop work on the floor and each
 * needs its own intercept:
 *
 *   1. Tab close / reload / manual URL bar change
 *      → `beforeunload` event. The browser shows its own native
 *        confirmation; we can't customise the copy in any modern
 *        browser, but the native prompt is enough to stop accidents.
 *
 *   2. In-app anchor clicks (`<a href="...">`, Next's `<Link>`)
 *      → captured at the document level so we run before the App
 *        Router's own click handler. We show a Salt confirm dialog;
 *        on "Discard" we re-issue the navigation, on "Keep editing"
 *        we just preventDefault.
 *
 *   3. Programmatic navigation (`router.push` etc.)
 *      → both end up calling `history.pushState` /
 *        `history.replaceState` under the hood, so we monkey-patch
 *        those for the duration of being dirty and route through the
 *        same dialog. Patches are torn down when the editor goes
 *        clean again or unmounts.
 *
 * Only active while the editor is `dirty` (or any non-clean state
 * other than `saving` — saves can resolve regardless of leave) AND
 * while `?edit=1` is in the URL. That keeps the guard scoped to the
 * editor session, so a successful save followed by leaving the page
 * doesn't prompt.
 *
 * Implementation lives in a separate plugin (rather than inside
 * `Editor.tsx`) so the leave-guard surface area stays auditable.
 */
import { useEffect, useRef, useState } from 'react';
import { Button, DialogActions, DialogContent, DialogHeader, StackLayout } from '@salt-ds/core';

import { useSaveState } from '../EditorContext';
import { Dialog } from '../components/Dialog';

/**
 * `isIntraEditorNavigation` — true when the proposed navigation is
 * a same-page URL update that stays within the editor session and
 * doesn't drop any in-memory state, so the leave prompt would be
 * spurious. Returns true when:
 *
 *   - the pathname is identical to the current one, AND
 *   - `?edit=1` is still set on the target (we're not exiting edit
 *     mode — exiting edit mode IS a real "leave" that should
 *     prompt), AND
 *   - the only search params that differ are intra-editor view
 *     toggles that the editor handles in-place (currently `mode`,
 *     for the WYSIWYG/Source switcher).
 *
 * The third clause is intentionally tight: any URL change OTHER
 * than the recognised intra-editor params still routes through the
 * prompt. That keeps the safety net in place for navigations that
 * happen to share the same pathname (e.g. a `?filter=...` change
 * in a future feature would re-render the page and could discard
 * editor state).
 */
const INTRA_EDITOR_PARAMS = new Set(['mode']);
function isIntraEditorNavigation(target: URL): boolean {
  if (target.pathname !== window.location.pathname) return false;
  if (target.searchParams.get('edit') !== '1') return false;
  const current = new URLSearchParams(window.location.search);
  if (current.get('edit') !== '1') return false;
  // Build the union of param keys that appear on either side and
  // diff them. If every differing key is in the intra-editor
  // allowlist, the navigation is in-place.
  const keys = new Set<string>([...current.keys(), ...target.searchParams.keys()]);
  for (const key of keys) {
    if (current.get(key) === target.searchParams.get(key)) continue;
    if (!INTRA_EDITOR_PARAMS.has(key)) return false;
  }
  return true;
}

/**
 * Resolves a clicked anchor's href to an in-app same-origin URL we
 * should intercept. Returns `null` when the click is not something
 * we want to guard (external link, `mailto:`, `target=_blank`, etc.).
 */
function resolveInAppNavigation(event: MouseEvent): string | null {
  // Respect modifier keys / non-primary buttons — those let the
  // user open a copy in a new tab without losing their work, so we
  // don't need to confirm.
  if (event.defaultPrevented) return null;
  if (event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const target = event.target as Element | null;
  if (!target) return null;
  const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
  if (!anchor) return null;
  // Anchors that explicitly opt out of SPA navigation (download
  // attribute, new-tab target, opener-relationship attrs) would
  // navigate the current page synchronously — beforeunload picks
  // those up so we can stay out of their way here.
  if (anchor.target && anchor.target !== '' && anchor.target !== '_self') return null;
  if (anchor.hasAttribute('download')) return null;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  // In-page hash jumps don't lose work; let them through.
  const sameDocument =
    url.pathname === window.location.pathname && url.search === window.location.search;
  if (sameDocument && url.hash) return null;
  return url.pathname + url.search + url.hash;
}

/**
 * Strict equality for the spec'd `Editor` mounting model: at most
 * one `LeaveGuardPlugin` per editor. The history patch is process-
 * global so guarding against double-install protects against an
 * accidental remount during HMR or React strict-mode double-invoke.
 */
let historyPatched = false;

export const LeaveGuardPlugin = () => {
  const { saveState } = useSaveState();
  // Treat anything other than `clean` as "has unsaved work" for the
  // purposes of guarding. `saving` is included so a user who clicks
  // Save then immediately tries to navigate gets prompted — the save
  // pipeline may still be in flight and tearing the page down would
  // abort it.
  const isDirty = saveState !== 'clean';

  // Pending navigation queued behind the confirm dialog. `null` when
  // no prompt is up. Kept as state (not ref) so the dialog re-renders
  // when it changes.
  const [pending, setPending] = useState<null | (() => void)>(null);

  // We need a stable handle inside the document-level click listener
  // so the listener doesn't need to re-attach on every render.
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // When the user explicitly clicks "Discard", we issue a full-page
  // navigation via `location.assign`. That triggers `beforeunload`,
  // which our listener (1) handles — so without this flag the browser
  // would stack a NATIVE confirmation on top of the Salt one the
  // user just confirmed. The flag is set just before the assign
  // call; the beforeunload handler reads it and lets the unload
  // through unchallenged.
  const suppressBeforeUnloadRef = useRef(false);

  // (1) beforeunload — covers tab close / reload / URL bar.
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (suppressBeforeUnloadRef.current) return;
      e.preventDefault();
      // Required for Chrome/Edge — the string is ignored, the
      // browser shows its own default copy.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  // (2) document-level anchor click capture.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!isDirtyRef.current) return;
      const href = resolveInAppNavigation(e);
      if (!href) return;
      // Intra-editor URL toggles (e.g. the WYSIWYG/Source mode
      // switcher) don't tear the editor down and don't risk data
      // loss — let them through unprompted. Without this gate the
      // user would see the unsaved-changes dialog whenever they
      // clicked between Visual and Source while having any
      // unsaved edits.
      const targetUrl = new URL(href, window.location.href);
      if (isIntraEditorNavigation(targetUrl)) return;
      // Stop App Router's own click handler from running this turn.
      // We'll re-trigger the navigation manually if the user
      // discards.
      e.preventDefault();
      e.stopPropagation();
      setPending(() => () => {
        // Full-page navigation rather than History API push.
        //
        // History: an earlier version used `pushState` + a manual
        // `popstate` dispatch to keep the navigation soft. That kept
        // the editor's React subtree mounted across the URL change —
        // App Router responded to the popstate by re-reading the
        // URL but didn't tear the editor layout down, so the user
        // saw the same editor pane on the wrong route.
        //
        // For the "Discard my work" path a hard reload is fine and
        // arguably correct: the user explicitly chose to abandon
        // in-memory state, so paying for a fresh document load
        // (server data, clean React tree, no lingering listeners)
        // is exactly what we want.
        window.location.assign(href);
      });
    };
    // Capture phase so we run before App Router's bubbled handler.
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // (3) history.pushState / replaceState patch — catches
  // programmatic `router.push` and similar.
  useEffect(() => {
    if (!isDirty) return;
    if (historyPatched) return;
    historyPatched = true;
    const realPushState = window.history.pushState.bind(window.history);
    const realReplaceState = window.history.replaceState.bind(window.history);
    const guard =
      <T extends (...args: Parameters<typeof window.history.pushState>) => void>(real: T) =>
      (...args: Parameters<typeof window.history.pushState>) => {
        if (!isDirtyRef.current) {
          real(...args);
          return;
        }
        // Resolve the target URL the caller asked to navigate to.
        // `pushState` accepts `url` as the third argument; null
        // means "stay at the current URL" (state change only, no
        // navigation) so we let those through unconditionally.
        const target = args[2];
        if (target == null) {
          real(...args);
          return;
        }
        const href = new URL(String(target), window.location.href);
        // Intra-editor URL toggles (e.g. WYSIWYG/Source mode)
        // route through `router.replace` which lands here; let
        // them through so the toggle doesn't pop the unsaved-
        // changes dialog on every click.
        if (isIntraEditorNavigation(href)) {
          real(...args);
          return;
        }
        setPending(() => () => {
          // Like the anchor-click path, do a full reload on
          // discard. Replaying just the `pushState` would skip
          // App Router's RSC fetching (the wrapper intercepts the
          // pushState call that lives INSIDE `router.push`; the
          // caller has already returned by the time we replay,
          // so the surrounding RSC machinery never runs).
          window.location.assign(href.toString());
        });
      };
    window.history.pushState = guard(realPushState) as typeof window.history.pushState;
    window.history.replaceState = guard(realReplaceState) as typeof window.history.replaceState;
    return () => {
      window.history.pushState = realPushState;
      window.history.replaceState = realReplaceState;
      historyPatched = false;
    };
  }, [isDirty]);

  const handleDiscard = () => {
    const go = pending;
    setPending(null);
    if (!go) return;
    // The queued thunk performs a full-page `location.assign`, which
    // would otherwise fire our own beforeunload listener and stack a
    // native "Leave site?" prompt on top of the choice the user just
    // made. Suppress for the duration of the assign call.
    suppressBeforeUnloadRef.current = true;
    try {
      go();
    } finally {
      // The unload is asynchronous (the browser tears the document
      // down on its own schedule), so we can't reset eagerly without
      // re-arming the prompt mid-unload. In practice this code path
      // ends with the document being replaced, so the flag's lifetime
      // is bounded by page lifetime — leaving it set is fine.
    }
  };
  const handleKeepEditing = () => setPending(null);

  return (
    <Dialog open={pending !== null} onOpenChange={open => !open && handleKeepEditing()}>
      <DialogHeader header="Unsaved changes" />
      <DialogContent>
        <StackLayout gap={1}>
          <span>You have unsaved changes. Leaving now will discard them.</span>
        </StackLayout>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleKeepEditing}>Keep editing</Button>
        <Button sentiment="negative" onClick={handleDiscard}>
          Discard changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};
