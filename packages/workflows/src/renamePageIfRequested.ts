import path from 'node:path';
import fs from 'node:fs';
import type { SendSourceWorkflowMessage } from '@jpmorganchase/mosaic-types';

/**
 * Rename a freshly-written page on disk to honour an
 * `targetRoute` field from the editor's save dialog.
 *
 * Shared between `GitHubPullRequestWorkflow` and
 * `BitbucketPullRequestWorkflow` because the rename logic is
 * git-provider-agnostic (both providers' `addChanges` step does
 * `git add -A`, which picks up renames automatically — we just
 * need the working tree to reflect the new path before the
 * commit step).
 *
 * Returns either:
 *   - `{ ok: true, renamed: boolean }` — `renamed: false` means
 *     the call was a no-op (no target, no actual change, or
 *     same-path after normalisation).
 *   - `{ ok: false, error: string }` — the caller is expected
 *     to emit the error message via its workflow channel and
 *     abort the PR.
 *
 * The caller owns:
 *   - cleanup (`removeWorktree`) on the error path.
 *   - whether to surface success as a workflow progress event
 *     (we report the rename here so all callers stay
 *     consistent, but `ok: true / renamed: false` is silent).
 */
export interface RenamePageInput {
  /** VFS route the workflow received positionally (current path). */
  filePath: string;
  /** Optional new VFS route from the editor. */
  targetRoute: string | undefined;
  /** Source `prefixDir` — used to enforce same-source moves. */
  prefixDir: string;
  /** Source `subfolder` inside the repo's working tree. */
  subfolder: string;
  /** Absolute path to the worktree root. */
  repoDir: string;
  /** Absolute path of the file we just wrote (also the rename source). */
  pathOnDisk: string;
  sendWorkflowProgressMessage: SendSourceWorkflowMessage;
}

export type RenamePageResult =
  | { ok: true; renamed: boolean; newPathOnDisk?: string }
  | { ok: false; error: string };

export async function renamePageIfRequested({
  filePath,
  targetRoute,
  prefixDir,
  subfolder,
  repoDir,
  pathOnDisk,
  sendWorkflowProgressMessage
}: RenamePageInput): Promise<RenamePageResult> {
  if (typeof targetRoute !== 'string' || targetRoute === filePath) {
    return { ok: true, renamed: false };
  }

  // Normalise to leading-slash form so the comparisons below
  // work regardless of whether the editor stripped or kept it.
  const normalisedTarget = targetRoute.startsWith('/') ? targetRoute : `/${targetRoute}`;

  // Refuse cross-source moves explicitly — they'd imply a
  // different repository (potentially different credentials,
  // different PR target), which is well out of scope for a
  // single in-browser save. Source-level move tooling can be
  // added later as its own workflow.
  const prefixMatch = new RegExp(`^/?${prefixDir}/`);
  if (!prefixMatch.test(normalisedTarget)) {
    return {
      ok: false,
      error: `Refusing to rename across source boundaries — target ${normalisedTarget} is not under /${prefixDir}.`
    };
  }

  const newPathOnDisk = path.posix.join(
    repoDir,
    subfolder,
    normalisedTarget.replace(new RegExp(`^/?${prefixDir}/`), '')
  );

  // Same on-disk path after normalisation (e.g. user typed the
  // route with/without a leading slash). Treat as a no-op
  // rather than an `fs.rename` of a file onto itself, which is
  // a syscall some filesystems still consider an error.
  if (newPathOnDisk === pathOnDisk) {
    return { ok: true, renamed: false };
  }

  // Refuse to overwrite an existing target. `fs.access` throws
  // when the path doesn't exist, which is what we *want* here
  // — try/catch is the standard Node idiom for this check
  // (there's no non-throwing `exists` in the stable API).
  try {
    await fs.promises.access(newPathOnDisk);
    return {
      ok: false,
      error: `Refusing to rename: ${normalisedTarget} already exists.`
    };
  } catch {
    // Doesn't exist — proceed.
  }

  await fs.promises.mkdir(path.posix.dirname(newPathOnDisk), { recursive: true });
  await fs.promises.rename(pathOnDisk, newPathOnDisk);
  sendWorkflowProgressMessage(`Renamed page to ${normalisedTarget}`, 'IN_PROGRESS');
  return { ok: true, renamed: true, newPathOnDisk };
}
