/**
 * Per-app customisation point for the **new-page MDX template**.
 *
 * The catch-all route in `page.tsx` calls {@link buildNewPageTemplate}
 * to produce the raw bytes seeded into the editor when an author hits
 * "New Page" — both the body (the editor's left pane) and the
 * authored frontmatter (the Frontmatter tab's editable form).
 *
 * What to change here
 * -------------------
 * - **Default frontmatter keys** — add any required-by-your-layouts
 *   keys (e.g. `layout`, `description`, `tags`) with sensible empty
 *   defaults. The Frontmatter editor's `DEFAULT_REQUIRED_KEYS` set
 *   (`['title', 'layout']`) means an empty `layout` field already
 *   surfaces a required hint; pre-seeding it here is what gives
 *   authors a typed-input affordance instead of just the red error.
 *
 * - **Body skeleton** — most teams want more than a single H1 + one
 *   line of placeholder. Reference docs convention: an intro
 *   paragraph, a `## Usage` heading, etc.
 *
 * - **Per-folder variants** — switch on `input.parentFolder` /
 *   `input.pathname` to return different templates for different
 *   areas of the site (e.g. a `tutorials/` template with a "By the
 *   end of this guide you will…" intro, vs an `api/` template that
 *   starts with an `## Overview` and a `## Parameters` table
 *   skeleton).
 *
 * What NOT to change
 * ------------------
 * - The function must stay synchronous and pure (no I/O). It runs on
 *   the server during the page render for `?new=1` requests, before
 *   the editor mounts.
 * - The returned `body` MUST include the YAML frontmatter fence (the
 *   editor parses with `gray-matter`, which expects the standard
 *   `---\n…\n---\n` delimiters). The {@link composeTemplate} helper
 *   takes a structured frontmatter object + body string and assembles
 *   the fence for you — prefer it over hand-rolling the string.
 *
 * Adding required-key constraints
 * -------------------------------
 * To force authors to fill a field before save (e.g. you want every
 * new page to have a `description`), add the key both here AND to
 * the `requiredKeys` prop on `<FrontmatterPanel>` in
 * `mosaic-content-editor-plugin/.../FrontmatterPanel.tsx` (or wire
 * it through your host's `<EditorBody>` if you already custom-pass
 * the prop). Keeping the two in sync is the only coordination this
 * file needs with the editor plugin.
 */

import matter from 'gray-matter';

export interface NewPageTemplateInput {
  /**
   * The sanitised title the author entered in the New-Page dialog
   * (URL-encoded, `?title=…` decoded, trimmed, `---` stripped, capped
   * at 200 chars, falling back to `'New Page'`). Safe to embed as a
   * YAML scalar value via `JSON.stringify`.
   */
  title: string;
  /**
   * The full pathname of the page being created (leading `/`, no
   * `.mdx`). E.g. `/mosaic/configure/sources/my-new-source`.
   */
  pathname: string;
  /**
   * The parent folder of the page (leading `/`, no trailing slash).
   * E.g. `/mosaic/configure/sources`. Empty string when the page is
   * at the site root.
   */
  parentFolder: string;
}

export interface NewPageTemplate {
  /**
   * Authored frontmatter as a plain object. Will be YAML-serialised
   * into the standard `---\n…\n---\n` fence by {@link composeTemplate}.
   * Use empty strings (`''`) for keys you want the editor to flag as
   * required-but-missing.
   */
  frontmatter: Record<string, unknown>;
  /**
   * MDX body content (everything after the frontmatter fence). May
   * reference frontmatter values via `{meta.title}` etc. — the
   * preview pipeline injects the parsed frontmatter as `scope.meta`.
   */
  body: string;
}

/**
 * Default built-in template. Designed to be a sensible starting
 * point for a fresh Mosaic install; teams customising this file are
 * expected to either edit it in place or replace the call from
 * `buildNewPageTemplate` with their own implementation.
 */
function defaultTemplate(_input: NewPageTemplateInput): NewPageTemplate {
  return {
    frontmatter: {
      title: _input.title,
      // Seed the most common Mosaic layout. Keep this in sync
      // with the name exported by `@jpmorganchase/mosaic-layouts`
      // (`DetailTechnical`, not `DetailedTechnical` — a typo
      // here falls back to the host's default layout at render
      // and trips the FrontmatterEditor's unknown-layout
      // warning, which is recoverable but noisy).
      layout: 'DetailTechnical'
    },
    // `# {meta.title}` references the parsed frontmatter so subsequent
    // edits to the title automatically flow through to the heading —
    // the convention used across the existing docs.
    body: '# {meta.title}\n\nStart writing your page here.\n'
  };
}

/**
 * Pick a template for the given new-page request. Override this
 * function (or add branches inside it) to vary the template per
 * folder / per source / per anything else readable from the
 * `input` shape.
 *
 * The result is a structured object; {@link composeTemplate} renders
 * it to the actual bytes the editor sees. Keeping the structured
 * intermediate around makes per-folder branching readable and
 * keeps the YAML serialisation in one place.
 *
 * @example // Per-folder variant
 * export function buildNewPageTemplate(input: NewPageTemplateInput): NewPageTemplate {
 *   if (input.parentFolder.startsWith('/mosaic/configure/sources')) {
 *     return {
 *       frontmatter: { title: input.title, layout: 'DetailTechnical' },
 *       body: '# {meta.title}\n\n## Overview\n\n…\n\n## Configuration\n\n…\n'
 *     };
 *   }
 *   return defaultTemplate(input);
 * }
 */
export function buildNewPageTemplate(input: NewPageTemplateInput): NewPageTemplate {
  return defaultTemplate(input);
}

/**
 * Serialise a structured template into the raw bytes the editor
 * seeds itself with: standard YAML frontmatter fence followed by
 * the MDX body. `gray-matter.stringify` produces the same shape
 * the persist workflow writes to disk, so a save right after open
 * round-trips byte-for-byte.
 *
 * Frontmatter keys are emitted in iteration order (the order you
 * listed them in `buildNewPageTemplate`). Keep `title` first so
 * the PR diff for the first save is readable.
 *
 * @returns The full MDX file contents as a UTF-8 string:
 *   `---\n<yaml>\n---\n<body>`. Safe to pass directly to
 *   `LexicalComposer` or write to disk.
 */
export function composeTemplate(template: NewPageTemplate): string {
  // `matter.stringify(body, data)` returns `---\n<yaml>\n---\n<body>`
  // with a trailing newline if the body has one — which our default
  // bodies do, so the output is canonical.
  return matter.stringify(template.body, template.frontmatter);
}
