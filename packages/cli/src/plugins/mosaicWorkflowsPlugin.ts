import { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import path from 'node:path';
import type { SendSourceWorkflowMessage } from '@jpmorganchase/mosaic-types';

import { extractSecret, isSafeRoute, readSecret, secretsMatch } from './security.js';
import {
  WorkflowJob,
  WorkflowJobStore,
  type WorkflowJobStoreOptions,
  streamJobEvents
} from './workflowJobs.js';

export interface FastifyMosaicWorkflowsPluginOptions {
  /** Maximum job duration, validated once by `mosaic serve` at startup. */
  timeoutMs: number;
  /** Limits of the in-memory job store. */
  jobs?: WorkflowJobStoreOptions;
  /** Interval between `: ping` comments on an events stream. Default 15 seconds. */
  pingIntervalMs?: number;
}

/** Largest workflow request accepted (markdown + frontmatter + metadata). */
const MAX_WORKFLOW_REQUEST_BYTES = 5 * 1024 * 1024;
const SECRET_HEADER = 'x-mosaic-workflows-secret';

type WorkflowUser = { id?: string; sid?: string; name?: string; email?: string };

type WorkflowRequest = {
  name: string;
  route: string;
  user: WorkflowUser;
  isNewPage?: unknown;
  targetRoute?: unknown;
  [key: string]: unknown;
};

function validateWorkflowRequest(body: unknown): WorkflowRequest | string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Workflow request must be a JSON object';
  }
  const request = body as Record<string, unknown>;
  if (typeof request.name !== 'string' || request.name === '') {
    return 'Workflow name is required';
  }
  const user = request.user as WorkflowUser | undefined;
  const userId = user?.id ?? user?.sid;
  if (!user || typeof user !== 'object' || typeof userId !== 'string' || userId === '') {
    return 'Workflow must be run for a user';
  }
  if (!isSafeRoute(request.route)) return 'Workflow route is invalid';
  if (request.targetRoute !== undefined && !isSafeRoute(request.targetRoute)) {
    return 'Workflow target route is invalid';
  }
  return request as WorkflowRequest;
}

function parseLastEventId(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' && /^\d{1,9}$/.test(raw) ? Number(raw) : 0;
}

/**
 * The workflows run with the server's repository credentials, so every
 * request needs `MOSAIC_WORKFLOWS_SECRET` as a bearer token (or in
 * `x-mosaic-workflows-secret`). Without the env var nothing runs.
 */
async function requireWorkflowsSecret(request: FastifyRequest, reply: FastifyReply) {
  const expected = readSecret('MOSAIC_WORKFLOWS_SECRET');
  if (!expected) {
    return reply
      .code(503)
      .send({ error: 'Workflows are disabled: MOSAIC_WORKFLOWS_SECRET is not configured.' });
  }
  const provided = extractSecret(request.headers, SECRET_HEADER);
  if (!provided || !secretsMatch(provided, expected)) {
    return reply.code(401).send({ error: 'Unauthorized.' });
  }
  return undefined;
}

/** Reports body-parsing and other route errors as `{ error }`. */
function sendRequestError(error: FastifyError, _request: FastifyRequest, reply: FastifyReply) {
  const statusCode =
    typeof error.statusCode === 'number' && error.statusCode >= 400 ? error.statusCode : 500;
  if (statusCode >= 500) console.error('[Mosaic] Workflow request failed', error);
  return reply.code(statusCode).send({ error: error.message || 'Workflow request failed' });
}

/**
 * Turns the workflow's progress messages into job events: `COMPLETE`
 * finishes the job successfully, `ERROR` fails it and anything else is
 * progress. The job also finishes when the workflow settles, so one that
 * never sends `COMPLETE` still ends, and a workflow that can't run (no
 * source owns the route, missing workflow, thrown error) fails it.
 */
async function runWorkflow(
  job: WorkflowJob,
  run: (send: SendSourceWorkflowMessage) => Promise<boolean>,
  name: string
) {
  const send: SendSourceWorkflowMessage = (message, status) => {
    if (status === 'ERROR') job.fail(message);
    else if (status === 'COMPLETE') job.succeed(message);
    else job.progress(status, message);
  };
  try {
    const ran = await run(send);
    if (ran === false) job.fail(`Workflow ${name} could not be run`);
    else job.succeed(`Workflow ${name} finished`);
  } catch (e) {
    console.error(`[Mosaic] Workflow ${name} failed`, e);
    job.fail(e instanceof Error ? e.message : `Workflow ${name} failed`);
  }
}

async function mosaicWorkflows(
  fastify: FastifyInstance,
  { timeoutMs, jobs: jobOptions, pingIntervalMs }: FastifyMosaicWorkflowsPluginOptions
) {
  const { fs, core } = fastify.mosaic;
  const jobs = new WorkflowJobStore(jobOptions);
  const runningExecutions = new Set<string>();
  const openStreams = new Set<() => void>();

  fastify.addHook('preClose', async () => {
    for (const close of openStreams) close();
  });

  /**
   * Start a workflow. Responds `202 { jobId }`; follow the job with
   * `GET /workflows/jobs/:id/events`.
   */
  fastify.post(
    '/workflows/jobs',
    {
      bodyLimit: MAX_WORKFLOW_REQUEST_BYTES,
      onRequest: requireWorkflowsSecret,
      errorHandler: sendRequestError
    },
    async (request, reply) => {
      const parsed = validateWorkflowRequest(request.body);
      if (typeof parsed === 'string') return reply.code(400).send({ error: parsed });
      const {
        /* eslint-disable @typescript-eslint/no-unused-vars */
        type,
        token,
        channel,
        /* eslint-enable @typescript-eslint/no-unused-vars */
        route: routeReq,
        name,
        user,
        ...restParams
      } = parsed;
      const userId = (user.id ?? user.sid) as string;
      const data = { user, ...restParams };
      const newPage = restParams.isNewPage === true;

      let pagePath: string;
      if (newPage) {
        pagePath = /\.mdx?$/.test(routeReq) ? routeReq : `${routeReq}.mdx`;
        if (await fs.promises.exists(pagePath)) {
          return reply.code(409).send({ error: `${pagePath} already exists` });
        }
      } else {
        if (!(await fs.promises.exists(routeReq))) {
          return reply.code(404).send({ error: `${routeReq} not found` });
        }
        const route = (await fs.promises.stat(routeReq)).isDirectory()
          ? path.posix.join(routeReq, 'index')
          : routeReq;
        pagePath = (await fs.promises.realpath(route)) as string;
      }

      // A terminal SSE event (including timeout) can precede the end of
      // the actual write. Keep a retry out of the original save's worktree.
      const executionKey = JSON.stringify([userId, name, pagePath]);
      if (runningExecutions.has(executionKey)) {
        return reply.code(409).send({
          error:
            'Your previous workflow for this page is still running. Check for its result before retrying.'
        });
      }
      const job =
        runningExecutions.size < jobs.capacity ? jobs.create(userId, timeoutMs) : undefined;
      if (!job) {
        return reply
          .code(503)
          .header('Retry-After', '30')
          .send({ error: 'Too many workflows are running. Try again shortly.' });
      }
      runningExecutions.add(executionKey);
      job.progress('IN_PROGRESS', `Starting workflow ${name}`);
      // New pages don't exist yet, so core picks the owning source by its
      // prefixDir and reports an ERROR itself when none owns them.
      void runWorkflow(
        job,
        send =>
          newPage
            ? core.triggerWorkflow(send, name, pagePath, data, { newPage: true })
            : core.triggerWorkflow(send, name, pagePath, data),
        name
      ).finally(() => runningExecutions.delete(executionKey));
      return reply.code(202).send({ jobId: job.id });
    }
  );

  /**
   * Follow a job over Server-Sent Events: `progress` events, then one
   * `done` event with `{ status: 'SUCCESS' | 'ERROR', message }`, after
   * which the response ends. Events carry ids, so a client reconnecting
   * with `Last-Event-ID` (or `?lastEventId=`) only gets what it missed.
   * `user` must be the user the job was started for.
   */
  fastify.get<{
    Params: { id: string };
    Querystring: { user?: string; lastEventId?: string };
  }>(
    '/workflows/jobs/:id/events',
    { onRequest: requireWorkflowsSecret, errorHandler: sendRequestError },
    async (request, reply) => {
      const job = jobs.get(request.params.id);
      if (!job || typeof request.query.user !== 'string' || request.query.user !== job.userId) {
        return reply.code(404).send({ error: 'Workflow job not found' });
      }
      const lastEventId = parseLastEventId(
        request.headers['last-event-id'] ?? request.query.lastEventId
      );

      reply.hijack();
      const res = reply.raw;
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      });
      res.flushHeaders();
      const close = streamJobEvents(job, res, { lastEventId, pingIntervalMs });
      openStreams.add(close);
      res.once('close', () => openStreams.delete(close));
      return reply;
    }
  );
}

/**
 * Fastify plugin that adds support for the Mosaic Workflows
 * https://mosaic-mosaic-dev-team.vercel.app/mosaic/configure/admin/index
 */
export default fp(mosaicWorkflows, {
  fastify: '5.x',
  name: 'fastify-mosaic-workflows',
  dependencies: ['fastify-mosaic']
});
