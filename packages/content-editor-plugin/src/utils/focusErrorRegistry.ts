'use client';

/**
 * Tiny module-scoped registry so the StatusBanner can ask the editor
 * "please scroll to and focus the error block" without depending on
 * the Lexical context (the banner is a sibling of the editor, not a
 * child, so it cannot use useLexicalComposerContext).
 *
 * Only one handler can be registered at a time -- the latest call to
 * `register` replaces any previous handler. This mirrors the one-error-
 * at-a-time UX: there is never more than one active "Jump to error"
 * target.
 *
 * `register` returns its own unregister function so the registering
 * effect can clean up on tear-down without needing to coordinate with
 * other registrations.
 */
type FocusHandle = () => void;

let current: FocusHandle | null = null;

export function registerFocusErrorHandle(handle: FocusHandle): () => void {
  current = handle;
  return () => {
    if (current === handle) current = null;
  };
}

export function invokeFocusErrorHandle(): boolean {
  if (!current) return false;
  current();
  return true;
}
