/**
 * Auth.js v5 catch-all route handler for `/api/auth/*`.
 *
 * Auth.js v5 generates both verbs from a single config — re-export them
 * unchanged.
 *
 * Static-export builds (`MOSAIC_OUTPUT=export`) replace this file with
 * a stub via `scripts/static-export-route-stubs.mjs`.
 */
import { handlers } from '../../../../auth';

export const { GET, POST } = handlers;
