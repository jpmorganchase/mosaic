/**
 * App Router preview/compile endpoint used by the content-editor plugin.
 *
 * JSON contract — the editor posts `{ mode, text }` and receives
 * `{ source }` (compiled MDX) or `{ source: null, error, exception }`
 * on compile failure. Always returns 200 for the compile-error case so
 * the editor can display the error inline.
 *
 * Static-export builds (`MOSAIC_OUTPUT=export`) replace this file with
 * a stub via `scripts/static-export-route-stubs.mjs`.
 */
import { NextResponse } from 'next/server';
import { compileMDX } from '@jpmorganchase/mosaic-site-middleware';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let compiledMdx;
    try {
      if (body.mode === 'markdown') {
        compiledMdx = await compileMDX(body.text, false /** don't parse frontmatter */);
      }
    } catch (ex: unknown) {
      return NextResponse.json(
        { source: null, error: 'compilation error', exception: getErrorMessage(ex) },
        { status: 200 }
      );
    }
    return NextResponse.json({ source: compiledMdx });
  } catch (ex) {
    return new NextResponse(getErrorMessage(ex), { status: 500 });
  }
}
