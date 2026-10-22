export interface NewPageOwnerCandidate {
  prefixDir: string | undefined;
  hasWorkflow(name: string): boolean;
}

/**
 * Picks the source that a new page at `filePath` should be created in: of
 * the sources that have the workflow, the one whose `prefixDir` is the
 * deepest folder containing the page.
 *
 * Ownership can't be decided by checking which source has the page's
 * parent folder, as it is for existing pages: a source's filesystem also
 * contains the parents of its `prefixDir`, so a source mounted at
 * `/mosaic/docs` would claim `/mosaic/new-page.mdx` and write it outside
 * its own folder.
 */
export function findNewPageOwner<T extends NewPageOwnerCandidate>(
  sources: Iterable<T>,
  filePath: string,
  workflowName: string
): T | undefined {
  const route = filePath.replace(/^\/+/, '');
  let owner: T | undefined;
  for (const source of sources) {
    const { prefixDir } = source;
    if (prefixDir === undefined || !source.hasWorkflow(workflowName)) continue;
    if (prefixDir !== '' && !route.startsWith(`${prefixDir}/`)) continue;
    if (!owner || prefixDir.length > (owner.prefixDir as string).length) owner = source;
  }
  return owner;
}
