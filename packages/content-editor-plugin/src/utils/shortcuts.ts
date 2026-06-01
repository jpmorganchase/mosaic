/**
 * Keyboard-shortcut helpers.
 *
 * Shortcuts are authored once in a platform-neutral canonical form
 * (e.g. `"Mod+S"`, `"Mod+Shift+Z"`) and converted into two shapes at
 * the consumption sites:
 *
 *   1. A human-readable label for tooltips — `⌘S` on macOS, `Ctrl+S`
 *      everywhere else. We also emit an `aria-keyshortcuts`-compatible
 *      form (`"Meta+S"` / `"Control+S"`) so assistive tech can announce
 *      the binding without parsing the visual glyphs.
 *   2. A predicate that matches a `KeyboardEvent`, so the global
 *      listener in `KeyboardShortcutsPlugin` can dispatch without
 *      hand-rolling modifier checks per binding.
 *
 * `Mod` collapses Cmd-on-mac vs. Ctrl-elsewhere, matching the
 * convention used by VS Code, Notion, Lexical's own bindings, and
 * essentially every other web editor. Authoring `"Mod+S"` rather than
 * branching `isMac` at every call site keeps the shortcut table
 * single-sourced.
 *
 * Detection is intentionally lazy + cached: `navigator.platform` is
 * read on first call (always client-side; this module is only ever
 * imported into `'use client'` components) and the result memoised.
 * Using `userAgentData.platform` would be ideal but Safari hasn't
 * shipped it yet, and `navigator.platform` is "deprecated but
 * universally supported" — i.e. it'll outlive this codebase.
 */

type Modifier = 'Mod' | 'Shift' | 'Alt' | 'Ctrl' | 'Meta';

/** Parsed canonical shortcut, e.g. `Mod+Shift+Z` → mods + `Z`. */
interface ParsedShortcut {
  mods: Set<Modifier>;
  /** Single key, uppercase letter or named key (e.g. `Enter`, `/`). */
  key: string;
}

let cachedIsMac: boolean | null = null;
function isMac(): boolean {
  if (cachedIsMac !== null) return cachedIsMac;
  if (typeof navigator === 'undefined') {
    cachedIsMac = false;
    return cachedIsMac;
  }
  // `navigator.platform` returns values like "MacIntel", "Win32",
  // "Linux x86_64", "iPhone". Substring-match on "Mac" covers
  // MacIntel + ARM ("MacARM" doesn't exist; Apple Silicon still
  // reports "MacIntel" for compatibility).
  cachedIsMac = /Mac|iPhone|iPad/i.test(navigator.platform);
  return cachedIsMac;
}

function parse(shortcut: string): ParsedShortcut {
  const parts = shortcut
    .split('+')
    .map(p => p.trim())
    .filter(Boolean);
  const mods = new Set<Modifier>();
  let key = '';
  for (const part of parts) {
    if (
      part === 'Mod' ||
      part === 'Shift' ||
      part === 'Alt' ||
      part === 'Ctrl' ||
      part === 'Meta'
    ) {
      mods.add(part as Modifier);
    } else {
      key = part;
    }
  }
  return { mods, key };
}

/**
 * Human-readable label for a shortcut, suitable for a tooltip.
 *   `Mod+S`        → `⌘S`     (mac) | `Ctrl+S`     (else)
 *   `Mod+Shift+Z`  → `⇧⌘Z`    (mac) | `Ctrl+Shift+Z` (else)
 *
 * On macOS we use the canonical Apple glyphs in order ⌃⌥⇧⌘ + key with
 * no separators — matches every native macOS menu and is what users
 * trained on the platform expect. Elsewhere we use `Ctrl+Shift+S`
 * with `+` separators, matching Windows / Linux convention.
 */
export function formatShortcut(shortcut: string): string {
  const { mods, key } = parse(shortcut);
  if (isMac()) {
    const glyphs: string[] = [];
    if (mods.has('Ctrl')) glyphs.push('⌃');
    if (mods.has('Alt')) glyphs.push('⌥');
    if (mods.has('Shift')) glyphs.push('⇧');
    if (mods.has('Mod') || mods.has('Meta')) glyphs.push('⌘');
    return `${glyphs.join('')}${key}`;
  }
  const parts: string[] = [];
  if (mods.has('Mod') || mods.has('Ctrl')) parts.push('Ctrl');
  if (mods.has('Alt')) parts.push('Alt');
  if (mods.has('Shift')) parts.push('Shift');
  if (mods.has('Meta')) parts.push('Meta');
  parts.push(key);
  return parts.join('+');
}

/**
 * Token form of {@link formatShortcut}, intended for rendering each
 * piece of a shortcut as a discrete keycap (e.g. one Salt `Kbd` per
 * token, with a small gap between them) rather than as a single
 * cramped string inside one keycap.
 *
 * Order matches {@link formatShortcut}:
 *   `Mod+Shift+Z` on mac    → `['⇧', '⌘', 'Z']`
 *   `Mod+Shift+Z` elsewhere → `['Ctrl', 'Shift', 'Z']`
 *
 * Returned as a plain array (rather than reusing `formatShortcut` and
 * splitting) because on mac the glyphs have no separator to split on
 * and a per-character split would also chop multi-char keys like
 * `Enter` or `Escape` should they ever be added.
 */
export function formatShortcutTokens(shortcut: string): string[] {
  const { mods, key } = parse(shortcut);
  const tokens: string[] = [];
  if (isMac()) {
    if (mods.has('Ctrl')) tokens.push('⌃');
    if (mods.has('Alt')) tokens.push('⌥');
    if (mods.has('Shift')) tokens.push('⇧');
    if (mods.has('Mod') || mods.has('Meta')) tokens.push('⌘');
  } else {
    if (mods.has('Mod') || mods.has('Ctrl')) tokens.push('Ctrl');
    if (mods.has('Alt')) tokens.push('Alt');
    if (mods.has('Shift')) tokens.push('Shift');
    if (mods.has('Meta')) tokens.push('Meta');
  }
  tokens.push(key);
  return tokens;
}

/**
 * ARIA `aria-keyshortcuts` value. The spec wants space-separated
 * tokens of the form `Modifier+Modifier+Key`, with `Control`, `Alt`,
 * `Shift`, `Meta` as modifier names. We emit a single binding
 * normalised to the user's actual platform key (so screen readers
 * announce the same shortcut the user will actually press), which is
 * exactly what's specified in WAI-ARIA 1.2 §6.6.6.
 */
export function ariaKeyshortcuts(shortcut: string): string {
  const { mods, key } = parse(shortcut);
  const tokens: string[] = [];
  if (mods.has('Ctrl') || (!isMac() && mods.has('Mod'))) tokens.push('Control');
  if (mods.has('Alt')) tokens.push('Alt');
  if (mods.has('Shift')) tokens.push('Shift');
  if (mods.has('Meta') || (isMac() && mods.has('Mod'))) tokens.push('Meta');
  tokens.push(key);
  return tokens.join('+');
}

/**
 * Predicate that returns `true` iff the `KeyboardEvent` matches the
 * canonical shortcut. Used by `KeyboardShortcutsPlugin` to dispatch
 * actions; the predicate intentionally does NOT call `preventDefault`
 * — that's the caller's responsibility, since not every shortcut
 * wants to suppress the browser default.
 *
 * Key comparison is case-insensitive on the letter (the `key` value
 * varies with Shift state: `S` when shifted, `s` when not). For
 * single-letter bindings we compare upper-cased. For named keys
 * (`Enter`, `Escape`, `/`) we compare verbatim.
 */
export function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const { mods, key } = parse(shortcut);
  const wantMeta = mods.has('Meta') || (isMac() && mods.has('Mod'));
  const wantCtrl = mods.has('Ctrl') || (!isMac() && mods.has('Mod'));
  if (event.metaKey !== wantMeta) return false;
  if (event.ctrlKey !== wantCtrl) return false;
  if (event.shiftKey !== mods.has('Shift')) return false;
  if (event.altKey !== mods.has('Alt')) return false;
  // Single-char keys: compare case-insensitively so Shift-state
  // doesn't break the match. Multi-char (`Enter`, `Escape`): exact.
  if (key.length === 1) {
    return event.key.toUpperCase() === key.toUpperCase();
  }
  return event.key === key;
}

// --- Canonical shortcut table ---------------------------------------
//
// Single source of truth for every editor binding. Each entry has the
// canonical form (used for matching + formatted on display) and a
// human label (used in tooltips and the README table). Adding a new
// shortcut means appending one row here and either registering it
// with Lexical's command system (built-ins like Bold are already
// handled by Lexical's RichTextPlugin) or wiring it in
// `KeyboardShortcutsPlugin`.

export const SHORTCUTS = {
  bold: 'Mod+B',
  italic: 'Mod+I',
  undo: 'Mod+Z',
  redo: 'Mod+Shift+Z',
  insertLink: 'Mod+K',
  save: 'Mod+S',
  help: 'Mod+/'
} as const;

export type ShortcutKey = keyof typeof SHORTCUTS;

/**
 * Human descriptions for each shortcut, surfaced in the in-app
 * "Keyboard shortcuts" dialog and (indirectly, by reading this map)
 * the README. Kept next to the canonical table so adding a binding
 * is one edit per location rather than three.
 */
export const SHORTCUT_LABELS: Record<ShortcutKey, string> = {
  bold: 'Bold',
  italic: 'Italic',
  undo: 'Undo',
  redo: 'Redo',
  insertLink: 'Insert link',
  save: 'Save (open Pull Request dialog)',
  help: 'Show this shortcut help'
};
