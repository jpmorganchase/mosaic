/**
 * Lets controls that leave edit mode ask the mounted editor to confirm
 * first, including controls outside the editor's React tree, such as the
 * app header's Stop Editing item.
 *
 * Leaving edit mode calls `router.replace`, which renders the page
 * without the editor before the history change that `LeaveGuardPlugin`
 * intercepts, so the editor would be gone before it could ask. The
 * package is bundled with code splitting, so every entry point shares
 * this module's state.
 */
type LeaveGuard = (leave: () => void) => boolean;

let activeGuard: LeaveGuard | null = null;

/** Registers the mounted editor's guard, and returns a function that removes it. */
export function registerLeaveGuard(guard: LeaveGuard) {
  activeGuard = guard;
  return () => {
    if (activeGuard === guard) activeGuard = null;
  };
}

/**
 * Runs `leave` straight away, or after the reader chooses to discard
 * unsaved changes. A guard returns `true` when it has taken over.
 */
export function confirmLeave(leave: () => void) {
  if (activeGuard?.(leave)) return;
  leave();
}
