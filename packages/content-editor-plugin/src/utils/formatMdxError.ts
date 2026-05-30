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
 *
 * In Server Action contexts the error has been re-serialised across
 * the RSC boundary and most non-enumerable / class-instance fields
 * are stripped — only `message` reliably survives. Callers therefore
 * combine this with `parseLocationFromMessage` (which parses the
 * `(line:col)` suffix MDX appends to its error messages) to recover
 * a location whenever the structured fields are missing.
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

// Matches MDX/vfile location suffixes:
//   "(12:3)"          — single point
//   "(12:3-12:7)"     — range
//   "(12:3-13:1)"     — multi-line range
// Anchored to the end of the string so we don't accidentally match
// a "(1:2)" inside the body of the error message.
const LOCATION_SUFFIX = /\((\d+):(\d+)(?:-\d+:\d+)?\)\s*$/;

function parseLocationFromMessage(message: string): { line?: number; column?: number } {
  const match = LOCATION_SUFFIX.exec(message);
  if (!match) return {};
  return { line: Number(match[1]), column: Number(match[2]) };
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

  // The library wraps errors as:
  //   [next-mdx-remote-client] error compiling MDX:
  //   <original mdx message ending in (line:col)>
  //
  //   <code frame>
  //
  //   More information: https://...
  //
  // We only want the original message (first non-prefix line) for the
  // banner; the code frame is helpful debug context but too noisy for
  // the headline and is preserved in `raw` for the "Show details"
  // disclosure.
  let message = raw;
  for (const re of NOISY_PREFIXES) {
    message = message.replace(re, '');
  }
  // Keep only the first line — everything after is codeframe + docs URL.
  message = message.split('\n', 1)[0];
  message = message.replace(TRAILING_DOCS_URL, '').trim();
  // Pull line/col out of the suffix BEFORE stripping it, so the
  // structured fields and the displayed text stay in sync. We prefer
  // the structured fields on the original error object when they
  // exist (server-side they often do) and only fall back to parsing
  // when the RSC boundary has stripped them — see extractLocation.
  const fromObject = extractLocation(err);
  const fromMessage = parseLocationFromMessage(message);
  const line = fromObject.line ?? fromMessage.line;
  const column = fromObject.column ?? fromMessage.column;
  message = message.replace(LOCATION_SUFFIX, '').trim();
  // Strip trailing period for nicer headline composition.
  message = message.replace(/\.$/, '');

  const hint = deriveHint(message);

  return { message, line, column, hint, raw };
}
