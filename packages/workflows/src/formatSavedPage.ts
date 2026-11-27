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
 * from formatting the page (syntax it can't parse, an invalid option)
 * leaves the page as the editor wrote it, so a save never fails because of
 * formatting.
 *
 * The content server holds the credentials it pushes with, so nothing from
 * the repository may run in it. Prettier runs JavaScript and TypeScript
 * configuration files, imports a shared configuration a configuration
 * names, and loads plugins, so a page is only formatted with a
 * configuration that is data (JSON, YAML, JSON5, TOML or a `prettier` key
 * in `package.json`), holds its options itself and needs no plugins.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as prettier from 'prettier';
import { parse as parseYaml } from 'yaml';

import { keepOriginalBlankLines } from './keepOriginalBlankLines.js';

/** `true` when `target` is `dir` or inside it. */
function isInside(dir: string, target: string): boolean {
  const relative = path.relative(dir, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/** Options, rather than the name of a shared configuration (an empty file has none). */
const isOptions = (config: unknown) =>
  config === null || config === undefined || (typeof config === 'object' && !Array.isArray(config));
const prettierKey = (manifest: unknown) =>
  typeof manifest === 'object' && manifest !== null
    ? (manifest as { prettier?: unknown }).prettier
    : undefined;
/**
 * JSON5 comments and whitespace before a JSON5 document's value, as JSON5
 * reads them: a `//` comment ends at any line terminator, including U+2028
 * and U+2029, and `\s` is exactly JSON5's whitespace and line terminators.
 */
const leadingJson5Comments = /^(?:\s|\/\/[^\n\r\u2028\u2029]*|\/\*[\s\S]*?\*\/)*/;

/**
 * The Prettier configuration files that are data, each with a check that
 * the file holds options. JavaScript and TypeScript configuration files
 * aren't listed: Prettier runs them.
 */
const dataConfigs = new Map<string, (text: string) => boolean>([
  ['package.json', text => isOptions(prettierKey(JSON.parse(text)))],
  ['package.yaml', text => isOptions(prettierKey(parseYaml(text)))],
  ['.prettierrc', text => isOptions(parseYaml(text))],
  ['.prettierrc.json', text => isOptions(JSON.parse(text))],
  ['.prettierrc.yaml', text => isOptions(parseYaml(text))],
  ['.prettierrc.yml', text => isOptions(parseYaml(text))],
  // An object is the only JSON5 value that starts with `{`.
  ['.prettierrc.json5', text => text.replace(leadingJson5Comments, '').startsWith('{')],
  // A TOML document is always a table.
  ['.prettierrc.toml', () => true]
]);

/** Whether Prettier can load `configFile` without running code from the repository. */
async function isDataConfig(configFile: string): Promise<boolean> {
  const holdsOptions = dataConfigs.get(path.basename(configFile));
  if (!holdsOptions) return false;
  const text = await fs.promises.readFile(configFile, 'utf8');
  return holdsOptions(text.replace(/^\uFEFF/, ''));
}

type Format = (content: string) => Promise<string>;
const unchanged: Format = async content => content;
const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * A function formatting the page at `filePath` with the Prettier
 * configuration of the repository cloned at `repoDir`. It returns the page
 * unchanged when the repository has no Prettier configuration or ignores
 * the page, and, with a warning logged once, when the configuration would
 * run code or Prettier can't format the page.
 */
async function pageFormatter(filePath: string, repoDir: string): Promise<Format> {
  const warn = (reason: string) =>
    console.warn(`[Mosaic] Saved ${filePath} without formatting it: ${reason}.`);
  let options: prettier.Options;
  try {
    // Prettier looks for a configuration in every folder up to the root.
    // Clones live inside the content server's own folder, so only a
    // configuration from the repository itself counts.
    const configFile = await prettier.resolveConfigFile(filePath);
    if (!configFile || !isInside(path.resolve(repoDir), path.resolve(configFile))) {
      return unchanged;
    }
    const ignorePath = ['.gitignore', '.prettierignore']
      .map(name => path.join(repoDir, name))
      .filter(file => fs.existsSync(file));
    const info = await prettier.getFileInfo(filePath, { ignorePath, resolveConfig: false });
    if (info.ignored || !info.inferredParser) return unchanged;
    if (!(await isDataConfig(configFile))) {
      const name = path.basename(configFile);
      warn(
        `its Prettier configuration (${name}) is code or names a shared configuration, and Mosaic doesn't run code from the repository`
      );
      return unchanged;
    }
    // `editorconfig: true` matches the Prettier CLI that repositories run.
    // Prettier stores fresh results even with useCache disabled. Release the
    // entries for this save's temporary worktree after resolving the options.
    const resolved = await prettier
      .resolveConfig(filePath, {
        config: configFile,
        editorconfig: true,
        useCache: false
      })
      .finally(prettier.clearConfigCache);
    if (resolved?.plugins?.length) {
      warn(
        "its Prettier configuration needs plugins, and Mosaic doesn't run code from the repository"
      );
      return unchanged;
    }
    options = { ...resolved, filepath: filePath };
  } catch (error) {
    warn(`Prettier couldn't read its configuration (${messageOf(error)})`);
    return unchanged;
  }
  let failed = false;
  return async content => {
    // A page Prettier couldn't format is saved as written.
    if (failed) return content;
    try {
      return await prettier.format(content, options);
    } catch (error) {
      failed = true;
      warn(`Prettier couldn't format it (${messageOf(error)})`);
      return content;
    }
  };
}

/**
 * `content` formatted with the Prettier configuration of the repository
 * cloned at `repoDir`, for the file at `filePath` inside it. Returns
 * `content` unchanged when the repository has no Prettier configuration,
 * ignores the file, has a configuration that would run code, or Prettier
 * can't format it.
 */
export async function formatSavedPage(
  filePath: string,
  content: string,
  repoDir: string
): Promise<string> {
  return (await pageFormatter(filePath, repoDir))(content);
}

/**
 * The page to commit: formatted like the repository and, for an existing
 * page, with the blank lines the editor dropped put back (see
 * `./keepOriginalBlankLines.ts`): those in lists, so loose lists stay
 * loose, and those after the frontmatter. Formatting runs again after they
 * are put back, so a list that is loose anywhere is written loose
 * throughout, as Prettier writes it.
 */
export async function finishSavedPage({
  filePath,
  content,
  original,
  repoDir
}: {
  /**
   * Where the page is saved, after any rename: which configuration and
   * ignore rules apply depends on it.
   */
  filePath: string;
  content: string;
  /** The page before the save; `undefined` for a new page. */
  original: string | undefined;
  repoDir: string;
}): Promise<string> {
  const format = await pageFormatter(filePath, repoDir);
  const formatted = await format(content);
  if (original === undefined) return formatted;
  const restored = keepOriginalBlankLines(original, formatted);
  return restored === formatted ? formatted : format(restored);
}
