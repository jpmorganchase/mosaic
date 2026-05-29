/**
 * Turn whatever `next-mdx-remote-client` / `@mdx-js/mdx` hands us on a
 * compile failure into a structured `EditorError` the status banner
 * can render nicely.
 *
 * `serialize` returns `{ error }` where `error` is a `vfile`-shaped
 * plain object with `message`, optional `line` / `column` / `place`,
 * and a noisy prefix like `[next-mdx-remote-client] error compiling
 * MDX: ...`. We strip the prefix, pull out the location, and
 * synthesise a short human-readable hint for the most common
 * authoring mistakes (stray `<`, unclosed JSX, unknown component,
 * unclosed code fence) so the editor can guide the user instead of
 * dumping raw compiler output on them.
 */
import type { EditorError } from '../EditorContext';

const NOISY_PREFIXES = [
  /^\[next-mdx-remote-client\]\s*error\s+compiling\s+MDX:\s*/i,
  /^MDX Error:\s*/i,
  /^Error:\s*/i
];

const TRAILING_DOCS_URL = /\s*More information:\s*https?:\/\/\S+\.?$/i;

/**
 * Best-effort hint generator. Each rule returns a short, actionable
 * sentence; rules are ordered most-specific first so the most useful
 * hint wins. All rules are optional — if none match the banner just
 * shows the raw message and the user can still recover.
 */
function deriveHint(message: string): string | undefined {
  const m = message.toLowerCase();

  if (m.includes('unexpected end of file before name')) {
    return 'A `<` was typed but no element name follows. Either complete the tag (e.g. `<MyComponent />`) or escape it as `\\<` to render a literal less-than sign.';
  }
  if (m.includes('unexpected character') && m.includes('before name')) {
    return 'Looks like a `<` that the MDX parser interpreted as the start of a JSX tag. Escape it as `\\<` to render a literal less-than sign.';
  }
  if (m.includes('could not parse expression with acorn')) {
    return 'Curly braces `{}` are interpreted as JavaScript expressions in MDX. Escape a literal `{` as `\\{`, or wrap the content in a fenced code block.';
  }
  if (m.includes('expected a closing tag') || m.includes('unexpected closing tag')) {
    return 'A JSX-style tag is unclosed or mismatched. Every `<Foo>` needs a matching `</Foo>`, or write it self-closing as `<Foo />`.';
  }
  if (m.includes('unexpected end of file') && m.includes('code')) {
    return 'A fenced code block (```) was opened but never closed.';
  }
  if (m.includes('could not resolve') || m.includes('is not defined')) {
    return 'A component name was used that the page does not provide. Check the spelling, or remove the tag if it was a typo.';
  }
  return undefined;
}

/**
 * `serialize`'s error is a plain object (vfile-shaped) with `message`
 * and either top-level `line`/`column` or a nested `place.start`.
 */
function extractLocation(err: unknown): { line?: number; column?: number } {
  if (!err || typeof err !== 'object') return {};
  const e = err as Record<string, unknown>;
  const line = typeof e.line === 'number' ? e.line : undefined;
  const column = typeof e.column === 'number' ? e.column : undefined;
  if (line || column) return { line, column };
  const place = e.place as { start?: { line?: number; column?: number } } | undefined;
  if (place?.start) {
    return { line: place.start.line, column: place.start.column };
  }
  return {};
}

function rawMessage(err: unknown): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || err.name;
  if (typeof err === 'object') {
    const e = err as Record<string, unknown>;
    const msg = e.reason ?? e.message ?? e.name;
    if (typeof msg === 'string' && msg) return msg;
    try {
      return JSON.stringify(err);
    } catch {
      return Object.prototype.toString.call(err);
    }
  }
  return String(err);
}

export function formatMdxError(err: unknown): EditorError {
  const raw = rawMessage(err);

  // Strip noisy compiler prefixes and the trailing "More information:"
  // URL — the URL isn't clickable in the banner and the prefix tells
  // the user nothing they don't already know.
  let message = raw;
  for (const re of NOISY_PREFIXES) {
    message = message.replace(re, '');
  }
  message = message.replace(TRAILING_DOCS_URL, '').trim();
  // Strip trailing period for nicer headline composition.
  message = message.replace(/\.$/, '');

  const { line, column } = extractLocation(err);
  const hint = deriveHint(message);

  return { message, line, column, hint, raw };
}

