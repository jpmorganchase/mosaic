/**
 * Formats a saved page the way the repository's own Prettier setup would.
 *
 * The editor turns its document back into Markdown with Lexical, which
 * writes its own style: `*emphasis*`, four-space nested lists and no blank
 * line after the frontmatter. In a repository that formats its pages with
 * Prettier (often enforced by `prettier --check` in a hook or CI), every
 * save would then reformat parts of the page the author never touched, and
 * the pull request could fail the repository's own check.
 *
 * So, when the repository has a Prettier configuration, the page is
 * formatted with it before it is committed. Repositories without one are
 * left alone: Mosaic doesn't impose a style. Anything that stops Prettier
 * from formatting the page (a plugin the configuration needs, syntax it
 * can't parse) leaves the page as the editor wrote it, so a save never
 * fails because of formatting.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as prettier from 'prettier';

import { keepOriginalBlankLines } from './keepOriginalBlankLines.js';

/** `true` when `target` is `dir` or inside it. */
function isInside(dir: string, target: string): boolean {
  const relative = path.relative(dir, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/**
 * `content` formatted with the Prettier configuration of the repository
 * cloned at `repoDir`, for the file at `filePath` inside it. Returns
 * `content` unchanged when the repository has no Prettier configuration,
 * ignores the file, or Prettier can't format it.
 */
export async function formatSavedPage(
  filePath: string,
  content: string,
  repoDir: string
): Promise<string> {
  try {
    // Prettier looks for a configuration in every folder up to the root.
    // Clones live inside the content server's own folder, so only a
    // configuration from the repository itself counts.
    const configFile = await prettier.resolveConfigFile(filePath);
    if (!configFile || !isInside(path.resolve(repoDir), path.resolve(configFile))) {
      return content;
    }
    const ignorePath = ['.gitignore', '.prettierignore']
      .map(name => path.join(repoDir, name))
      .filter(file => fs.existsSync(file));
    const info = await prettier.getFileInfo(filePath, { ignorePath, resolveConfig: false });
    if (info.ignored || !info.inferredParser) return content;
    // `editorconfig: true` matches the Prettier CLI that repositories run.
    const options = await prettier.resolveConfig(filePath, {
      config: configFile,
      editorconfig: true
    });
    return await prettier.format(content, { ...options, filepath: filePath });
  } catch (error) {
    console.warn(
      `[Mosaic] Saved ${filePath} without formatting it: Prettier couldn't format it (${
        error instanceof Error ? error.message : String(error)
      }).`
    );
    return content;
  }
}

/**
 * The page to commit: formatted like the repository and, for an existing
 * page, with the original's blank lines between the lines the author didn't
 * change (see `./keepOriginalBlankLines.ts`). Formatting runs again after
 * the blank lines are restored, so a list that is loose anywhere is written
 * loose throughout, as Prettier writes it.
 */
export async function finishSavedPage({
  filePath,
  content,
  original,
  repoDir
}: {
  filePath: string;
  content: string;
  /** The page before the save; `undefined` for a new page. */
  original: string | undefined;
  repoDir: string;
}): Promise<string> {
  const formatted = await formatSavedPage(filePath, content, repoDir);
  if (original === undefined) return formatted;
  const restored = keepOriginalBlankLines(original, formatted);
  return restored === formatted ? formatted : formatSavedPage(filePath, restored, repoDir);
}
