import path from 'path';

/**
 * Compute the absolute on-disk path of the git worktree this source
 * uses for `(repoUrl, branch)`.
 *
 * Mirrors the layout `Repo.ts` lays down at clone time:
 *   `<cwd>/.tmp/.cloned_docs/<project>/<repo>/.mosaic-worktrees/<branch>`
 *
 * Exported so the CLI's raw-source resolver (and any future tool that
 * needs to read author-authored bytes for a git-repo-backed page) can
 * derive the same path without instantiating a `Repo` or duplicating
 * the formula. `Repo.ts` consumes this helper too, so the convention
 * has a single source of truth.
 *
 * Pure / sync / no side-effects — safe to call from the CLI parent
 * process at request time.
 *
 * @param repoUrl  The git URL exactly as it appears in the source's
 *                 `options.repo` (e.g.
 *                 `https://github.com/org/repo.git`). The trailing
 *                 `.git` is required; the resolver enforces this via
 *                 the zod schema on the source.
 * @param branch   The branch name from `options.branch`.
 * @param cwd      Defaults to `process.cwd()`. Only the tests / future
 *                 multi-process tooling should pass an explicit value;
 *                 the CLI and the worker both run with the same cwd
 *                 by construction.
 */
export function getWorktreeDir(repoUrl: string, branch: string, cwd: string = process.cwd()): string {
  return path.join(getCloneRootDir(repoUrl, cwd), '.mosaic-worktrees', branch);
}

/**
 * Compute the clone root directory (one level above the per-branch
 * worktree). Shared between `getWorktreeDir` (for callers that want
 * a specific branch's worktree) and `Repo.ts` (which also needs the
 * parent directory for `git worktree add` / cleanup).
 *
 * Kept private to this module; callers outside `source-git-repo`
 * should reach for `getWorktreeDir` instead.
 */
export function getCloneRootDir(repoUrl: string, cwd: string = process.cwd()): string {
  const { projectNameAndRepoName } = parseRepoUrl(repoUrl);
  return path.join(cwd, '.tmp/.cloned_docs', projectNameAndRepoName);
}

/**
 * Extract `<project>/<repo>` from a `…/project/repo.git` URL.
 *
 * Throws (via the destructure assertion) if the URL doesn't have the
 * expected `.git` suffix — that's the same assumption the zod schema
 * on the source enforces, so the cast is safe in normal flow and a
 * clearly-attributable error in misuse.
 */
function parseRepoUrl(repoUrl: string): { projectNameAndRepoName: string } {
  const [, projectNameAndRepoName] = new URL(repoUrl).pathname.match(
    /([^/]+\/[^/]+)\.git$/
  ) as RegExpMatchArray;
  return { projectNameAndRepoName };
}

