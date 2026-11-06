import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import path from 'node:path';
import md5 from 'md5';
import websocket from '@fastify/websocket';
import type { SendSourceWorkflowMessage } from '@jpmorganchase/mosaic-types';

import { isSafeRoute, readSecret, secretsMatch } from './security.js';

export interface FastifyMosaicAdminPluginOptions {
  prefix?: string;
  enableSourcePush?: boolean;
}

export interface WorkflowRequestBodyType {
  user: string;
  route: string;
  markdown: string;
  name: string;
}

/** Largest workflow message accepted (markdown + frontmatter + metadata). */
const MAX_WORKFLOW_MESSAGE_BYTES = 5 * 1024 * 1024;

type WorkflowUser = { id?: string; sid?: string; name?: string; email?: string };

type WorkflowMessage = {
  name: string;
  route: string;
  user: WorkflowUser;
  token?: unknown;
  channel?: unknown;
  isNewPage?: unknown;
  [key: string]: unknown;
};

function parseWorkflowMessage(raw: string): WorkflowMessage | string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return 'Workflow message is not valid JSON';
  }
  if (!parsed || typeof parsed !== 'object') return 'Workflow message must be an object';
  const message = parsed as Record<string, unknown>;
  if (typeof message.name !== 'string' || message.name === '') {
    return 'Workflow name is required';
  }
  const user = message.user as WorkflowUser | undefined;
  const userId = user?.id ?? user?.sid;
  if (!user || typeof user !== 'object' || typeof userId !== 'string' || userId === '') {
    return 'Workflow must be run for a user';
  }
  if (!isSafeRoute(message.route)) return 'Workflow route is invalid';
  return message as WorkflowMessage;
}

async function mosaicWorkflows(fastify: FastifyInstance) {
  await fastify.register(websocket, { options: { maxPayload: MAX_WORKFLOW_MESSAGE_BYTES } });
  const { fs, core } = fastify.mosaic;

  /**
   * Run a workflow.
   *
   * Every message must carry `token` = `MOSAIC_WORKFLOWS_SECRET`. The
   * workflows run with the server's repository credentials, so without a
   * configured secret the endpoint refuses to run anything.
   */
  fastify.get('/workflows', { websocket: true }, socket => {
    const sendError = (message: string, channel?: string) =>
      socket.send(JSON.stringify({ status: 'ERROR', message, ...(channel ? { channel } : {}) }));

    socket.on('message', async message => {
      if (socket.readyState !== socket.OPEN) return;
      try {
        const expectedToken = readSecret('MOSAIC_WORKFLOWS_SECRET');
        if (!expectedToken) {
          sendError('Workflows are disabled: MOSAIC_WORKFLOWS_SECRET is not configured.');
          return;
        }

        const parsed = parseWorkflowMessage(message.toString());
        if (typeof parsed === 'string') {
          sendError(parsed);
          return;
        }
        const {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          type,
          token,
          channel: requestedChannel,
          route: routeReq,
          name,
          user,
          ...restParams
        } = parsed;

        if (typeof token !== 'string' || !secretsMatch(token, expectedToken)) {
          sendError('Unauthorized.');
          return;
        }
        if (restParams.targetRoute !== undefined && !isSafeRoute(restParams.targetRoute)) {
          sendError('Workflow target route is invalid');
          return;
        }

        // Echo the caller's channel so it can pick its own messages off a
        // shared socket; fall back to the legacy md5 channel otherwise.
        const userId = (user.id ?? user.sid) as string;
        const channel =
          typeof requestedChannel === 'string' && /^[\w-]{1,128}$/.test(requestedChannel)
            ? requestedChannel
            : md5(`${userId.toLowerCase()} - ${name.toLowerCase()}`);

        const sendWorkflowProgressMessage: SendSourceWorkflowMessage = (info, status) =>
          socket.send(JSON.stringify({ status, message: info, channel }));

        if (restParams.isNewPage === true) {
          const pagePath = /\.mdx?$/.test(routeReq) ? routeReq : `${routeReq}.mdx`;
          if (await fs.promises.exists(pagePath)) {
            sendWorkflowProgressMessage(`${pagePath} already exists`, 'ERROR');
            return;
          }
          // The page doesn't exist yet, so core picks the owning source by
          // its prefixDir and reports an ERROR itself when none owns it.
          const started = await core.triggerWorkflow(
            sendWorkflowProgressMessage,
            name,
            pagePath,
            { user, ...restParams },
            { newPage: true }
          );
          if (started) sendWorkflowProgressMessage(`Workflow ${name} has started`, 'SUCCESS');
          return;
        }

        if (await fs.promises.exists(routeReq)) {
          const route = (await fs.promises.stat(routeReq)).isDirectory()
            ? path.posix.join(routeReq, 'index')
            : routeReq;
          const pagePath = (await fs.promises.realpath(route)) as string;
          core.triggerWorkflow(sendWorkflowProgressMessage, name, pagePath, {
            user,
            ...restParams
          });
          sendWorkflowProgressMessage(`Workflow ${name} has started`, 'SUCCESS');
        } else {
          sendWorkflowProgressMessage(`${routeReq} not found`, 'ERROR');
        }
      } catch (e) {
        console.error(e);
        sendError(e instanceof Error ? e.message : 'Workflow failed');
      }
    });
  });
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
