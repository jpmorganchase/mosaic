/**
 * Next.js calls `register()` once when a server starts (`next start`,
 * `next dev`, the standalone `server.js`), and not during `next build`.
 *
 * It validates the site's environment variables (see `lib/config.ts`). With
 * `NODE_ENV=production` an invalid configuration stops the server with one
 * error listing every problem; in development the list is logged instead.
 */
export async function register() {
  // Next.js already skips instrumentation during `next build`; keep it that
  // way so images can be built without their runtime env. The literal
  // `NEXT_RUNTIME` check lets the edge bundle drop the Node.js-only code.
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    process.env.NEXT_PHASE !== 'phase-production-build'
  ) {
    const { validateSiteConfig } = await import('./lib/config');
    try {
      validateSiteConfig();
    } catch (error) {
      // Left to Next.js, the error is logged but the server keeps listening
      // and answers every request with a 500. Exit so the deployment fails
      // visibly.
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }
}
