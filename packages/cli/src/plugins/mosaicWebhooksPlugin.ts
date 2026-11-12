import { createHmac } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

import { parseBitbucketRepoUrl } from './bitbucketRepoUrl.js';
import { readSecret, secretsMatch } from './security.js';

export interface FastifyMosaicWebhooksPluginOptions {
  /**
   * Pushes that reach the same source within this many milliseconds are
   * coalesced into one refresh, which runs at the end of the window.
   */
  debounceMs?: number;
}

const SECRET_ENV = 'MOSAIC_BITBUCKET_WEBHOOK_SECRET';
const MAX_BODY_BYTES = 1024 * 1024;
const DEFAULT_DEBOUNCE_MS = 5000;
const GIT_REPO_MODULE = 'source-git-repo';

/** A `repo:refs_changed` delivery reduced to what matching needs. */
interface PushEvent {
  projectKey: string;
  repoSlug: string;
  /** Pushed branch (and tag) names, without `refs/heads/` or `refs/tags/`. */
  refs: Set<string>;
}

function stripRefPrefix(ref: string) {
  return ref.replace(/^refs\/(heads|tags)\//, '');
}

/**
 * Bitbucket Data Center signs the raw body with the webhook's secret and
 * sends `X-Hub-Signature: sha256=<hex HMAC-SHA256>`.
 */
function isSignatureValid(body: Buffer, header: unknown, secret: string) {
  if (typeof header !== 'string') return false;
  const match = /^sha256=([0-9a-f]{64})$/i.exec(header.trim());
  if (!match) return false;
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  return secretsMatch(match[1].toLowerCase(), expected);
}

function parsePushEvent(body: Buffer): PushEvent | undefined {
  let payload;
  try {
    payload = JSON.parse(body.toString('utf8'));
  } catch {
    return undefined;
  }
  const projectKey = payload?.repository?.project?.key;
  const repoSlug = payload?.repository?.slug;
  if (typeof projectKey !== 'string' || typeof repoSlug !== 'string') return undefined;

  const refs = new Set<string>();
  for (const change of Array.isArray(payload.changes) ? payload.changes : []) {
    // A deleted ref has nothing new to fetch.
    if (!change || change.type === 'DELETE') continue;
    for (const ref of [change.ref?.displayId, change.ref?.id, change.refId]) {
      if (typeof ref === 'string' && ref !== '') refs.add(stripRefPrefix(ref));
    }
  }
  return { projectKey, repoSlug, refs };
}

function mosaicWebhooks(
  fastify: FastifyInstance,
  options: FastifyMosaicWebhooksPluginOptions,
  next: (err?: Error) => void
) {
  const { core } = fastify.mosaic;
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const scheduledRefreshes = new Map<string, NodeJS.Timeout>();

  // The signature covers the exact bytes Bitbucket sent, so keep the raw
  // body. This plugin is encapsulated: other routes keep the JSON parser.
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer', bodyLimit: MAX_BODY_BYTES },
    (_req, body, done) => done(null, body)
  );

  fastify.addHook('onClose', (_instance, done) => {
    scheduledRefreshes.forEach(timer => clearTimeout(timer));
    scheduledRefreshes.clear();
    done();
  });

  const refreshSource = async (name: string) => {
    try {
      if (await core.refreshSource(name)) {
        console.log(`[Mosaic] Webhook: checked ${name} for changes.`);
      } else {
        console.warn(
          `[Mosaic] Webhook: ${name} can't refresh on demand; it picks up the push at its next scheduled check.`
        );
      }
    } catch (e) {
      console.error(`[Mosaic] Webhook: refreshing ${name} failed.`, e);
    }
  };

  /** Returns `false` when a refresh of `name` is already scheduled. */
  const scheduleRefresh = (name: string) => {
    if (scheduledRefreshes.has(name)) return false;
    const timer = setTimeout(() => {
      scheduledRefreshes.delete(name);
      void refreshSource(name);
    }, debounceMs);
    timer.unref();
    scheduledRefreshes.set(name, timer);
    return true;
  };

  /** Running git-repo sources that follow the pushed repository and one of its pushed refs. */
  const findSources = async ({ projectKey, repoSlug, refs }: PushEvent) => {
    const project = projectKey.toLowerCase();
    const slug = repoSlug.toLowerCase();
    const sources = await core.listSources();
    return sources
      .map(({ name }) => name)
      .filter(name => {
        const definition = core.getSourceDefinition(name);
        if (!definition?.modulePath?.includes(GIT_REPO_MODULE)) return false;
        const { repo, branch } = (definition.options ?? {}) as { repo?: unknown; branch?: unknown };
        if (typeof repo !== 'string' || typeof branch !== 'string') return false;
        const parsed = parseBitbucketRepoUrl(repo);
        return (
          parsed?.projectKey === project &&
          parsed.repoSlug === slug &&
          refs.has(stripRefPrefix(branch))
        );
      });
  };

  /**
   * Bitbucket Data Center "Repository → Push" webhook. Refreshes the
   * matching git-repo sources now rather than at their next scheduled
   * check. Authenticated by the webhook secret's signature, not the admin
   * secret; disabled (404) unless `MOSAIC_BITBUCKET_WEBHOOK_SECRET` is set.
   *
   * Replies straight away (Bitbucket gives up after 10 seconds) and
   * refreshes in the background.
   */
  fastify.post(
    '/webhooks/bitbucket',
    {
      bodyLimit: MAX_BODY_BYTES,
      // Disabled: answer like an unknown route, before reading the body.
      onRequest: (_req, reply, done) => {
        if (readSecret(SECRET_ENV)) {
          done();
          return;
        }
        reply.callNotFound();
      }
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const secret = readSecret(SECRET_ENV);
      if (!secret) return reply.callNotFound();

      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      if (!isSignatureValid(body, req.headers['x-hub-signature'], secret)) {
        return reply.code(401).send({ message: 'Missing or invalid X-Hub-Signature.' });
      }

      const eventKey = req.headers['x-event-key'];
      if (eventKey === 'diagnostics:ping') {
        return reply.code(200).send({ message: 'Webhook is set up.' });
      }
      if (eventKey !== 'repo:refs_changed') {
        return reply.code(202).send({ message: `Ignored event '${String(eventKey)}'.` });
      }

      const event = parsePushEvent(body);
      if (!event) {
        return reply.code(400).send({ message: 'Invalid repo:refs_changed payload.' });
      }

      const repository = `${event.projectKey}/${event.repoSlug}`;
      const pushed = Array.from(event.refs).join(', ') || 'no refs';
      // Bitbucket's delivery id, to match log lines with the webhook's history.
      const requestId = req.headers['x-request-id'];
      const delivery = `push to ${repository} (${pushed})${
        typeof requestId === 'string' ? ` [${requestId}]` : ''
      }`;
      const sources = await findSources(event);
      if (sources.length === 0) {
        console.log(`[Mosaic] Webhook: ${delivery} matches no source.`);
        return reply
          .code(202)
          .send({ message: `No git-repo source follows ${repository} at ${pushed}.`, sources });
      }

      for (const name of sources) {
        const action = scheduleRefresh(name)
          ? `refreshing in ${debounceMs}ms`
          : 'refresh already scheduled';
        console.log(`[Mosaic] Webhook: ${delivery}: ${name} ${action}.`);
      }
      return reply.code(202).send({
        message: `Refreshing ${sources.length} source${sources.length === 1 ? '' : 's'}.`,
        sources
      });
    }
  );

  next();
}

/**
 * Fastify plugin that lets Bitbucket Data Center push webhooks refresh
 * git-repo sources immediately.
 * https://mosaic-mosaic-dev-team.vercel.app/mosaic/configure/sources/git-repo-source
 */
export default fp(mosaicWebhooks, {
  fastify: '5.x',
  name: 'fastify-mosaic-webhooks',
  dependencies: ['fastify-mosaic'],
  // Keeps the raw-body JSON parser to this plugin's routes.
  encapsulate: true
});
