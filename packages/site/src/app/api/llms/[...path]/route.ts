/**
 * The docs as Markdown, for agents: each page, `llms.txt` and
 * `llms-full.txt`, from the files `LlmsTxtPlugin` writes. See
 * `createLlmsHandler`.
 *
 * `next.config.js` rewrites `/<page>.md`, global and scoped LLM indexes,
 * and requests that accept `text/markdown` to this route in server builds.
 * Snapshot builds also copy the generated artifacts to `public/` for export.
 *
 * Static-export builds (`MOSAIC_OUTPUT=export`) replace this file with a
 * stub via `scripts/static-export-route-stubs.mjs`, and serve the copies in
 * `public/` only.
 */
import { createLlmsHandler } from '@jpmorganchase/mosaic-site-middleware';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = createLlmsHandler();
