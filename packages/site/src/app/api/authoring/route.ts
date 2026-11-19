import { AUTHORING_URL } from '../../../lib/authoring';

// Snapshot pages are prerendered; this endpoint always reads the deployed server's config.
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(
    { url: AUTHORING_URL ?? null },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
