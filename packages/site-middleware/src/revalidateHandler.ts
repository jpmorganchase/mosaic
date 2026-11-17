import { timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { MOSAIC_CONTENT_CACHE_TAG } from './cacheTags.js';
import { notifyContentChanged } from './liveReloadBus.js';

export interface RevalidateHandlerOptions {
  /** Resolve environment/placeholder policy in the host, on each request. */
  getSecret: () => { secret?: string; unavailableMessage?: string };
  invalidate?: (tag: string, profile: { expire: number }) => void | Promise<void>;
  notify?: () => void;
}

/** Fail-closed Node webhook. A successful invalidation precedes notification. */
export function createRevalidateHandler({
  getSecret,
  invalidate = revalidateTag,
  notify = notifyContentChanged
}: RevalidateHandlerOptions) {
  return async function POST(request: Request): Promise<Response> {
    const { secret, unavailableMessage } = getSecret();
    if (!secret)
      return Response.json(
        {
          ok: false,
          error: unavailableMessage ?? 'MOSAIC_REVALIDATE_SECRET is not configured on the server.'
        },
        { status: 503 }
      );
    const auth = request.headers.get('authorization');
    const provided =
      request.headers.get('x-mosaic-revalidate-secret') ||
      (auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null);
    const configuredBytes = Buffer.from(secret, 'utf8');
    const providedBytes = Buffer.from(provided ?? '', 'utf8');
    if (
      !provided ||
      providedBytes.length !== configuredBytes.length ||
      !timingSafeEqual(providedBytes, configuredBytes)
    ) {
      return Response.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
    }
    await invalidate(MOSAIC_CONTENT_CACHE_TAG, { expire: 0 });
    notify();
    return Response.json({
      ok: true,
      tag: MOSAIC_CONTENT_CACHE_TAG,
      revalidatedAt: new Date().toISOString()
    });
  };
}
