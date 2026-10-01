/**
 * Tests for the `persistContent` Server Action against a real WebSocket
 * server that speaks the CLI workflows protocol (echoes the caller's
 * channel, reports progress then COMPLETE).
 */
import { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocketServer } from 'ws';

const authMock = vi.fn();
const isAuthorizedEditorMock = vi.fn();
vi.mock('../../../../../auth', () => ({
  auth: authMock,
  isAuthorizedEditor: isAuthorizedEditorMock
}));

type Received = Record<string, unknown>;

let wss: WebSocketServer;
let received: Received[];
let onMessage: (socket: import('ws').WebSocket, message: Received) => void;
let closedSockets: number;

async function loadAction() {
  vi.resetModules();
  return import('../persistAction');
}

async function collect(stream: AsyncIterable<unknown>) {
  const events: unknown[] = [];
  for await (const event of stream) events.push(event);
  return events;
}

beforeEach(async () => {
  received = [];
  closedSockets = 0;
  wss = new WebSocketServer({ port: 0 });
  wss.on('connection', socket => {
    socket.on('message', data => {
      const message = JSON.parse(data.toString()) as Received;
      received.push(message);
      onMessage(socket, message);
    });
    socket.on('close', () => {
      closedSockets += 1;
    });
  });
  await new Promise(resolve => wss.once('listening', resolve));
  vi.stubEnv('MOSAIC_WORKFLOWS_URL', `ws://127.0.0.1:${(wss.address() as AddressInfo).port}`);
  vi.stubEnv('MOSAIC_WORKFLOWS_SECRET', 'workflows-secret');
  vi.stubEnv('MOSAIC_WORKFLOWS_TIMEOUT_MS', '2000');
  authMock.mockResolvedValue({ user: { name: 'Dev User', email: 'dev@mosaic.local' } });
  isAuthorizedEditorMock.mockReturnValue(true);
  onMessage = (socket, message) => {
    const { channel } = message;
    socket.send(JSON.stringify({ status: 'IN_PROGRESS', message: 'Saved page', channel }));
    socket.send(
      JSON.stringify({
        status: 'COMPLETE',
        message: { links: { self: [{ href: 'https://example.test/pr/1' }] } },
        channel
      })
    );
  };
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  await new Promise(resolve => wss.close(resolve));
});

describe('persistContent', () => {
  it('streams progress and completion for its own channel, then closes the socket', async () => {
    const { persistContent } = await loadAction();
    const events = await collect(
      persistContent({ route: '/mosaic/index', markdown: '# Hello', frontmatter: 'title: Hi' })
    );

    expect(events).toEqual([
      { kind: 'progress', message: expect.objectContaining({ status: 'IN_PROGRESS' }) },
      { kind: 'complete', prHref: 'https://example.test/pr/1' }
    ]);
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      token: 'workflows-secret',
      name: 'save',
      route: '/mosaic/index',
      markdown: '# Hello',
      frontmatter: 'title: Hi',
      user: { sid: 'dev@mosaic.local', email: 'dev@mosaic.local' }
    });
    await vi.waitFor(() => expect(closedSockets).toBe(1));
  });

  it('ignores messages addressed to another channel', async () => {
    onMessage = (socket, message) => {
      socket.send(JSON.stringify({ status: 'ERROR', message: 'not ours', channel: 'other' }));
      socket.send(JSON.stringify({ status: 'COMPLETE', message: {}, channel: message.channel }));
    };
    const { persistContent } = await loadAction();
    const events = await collect(persistContent({ route: '/mosaic/index', markdown: '# Hi' }));
    expect(events).toEqual([{ kind: 'complete', prHref: null }]);
  });

  it('reports a timeout when the backend never answers', async () => {
    vi.stubEnv('MOSAIC_WORKFLOWS_TIMEOUT_MS', '50');
    onMessage = () => {};
    const { persistContent } = await loadAction();
    const events = await collect(persistContent({ route: '/mosaic/index', markdown: '# Hi' }));
    expect(events).toEqual([
      { kind: 'error', message: 'Timed out waiting for the workflows backend.' }
    ]);
    await vi.waitFor(() => expect(closedSockets).toBe(1));
  });

  it.each([
    [{ route: '/mosaic/../../etc/passwd', markdown: '# Hi' }, 'Invalid page route.'],
    [
      { route: '/mosaic/index', targetRoute: '/mosaic\\x.mdx', markdown: '# Hi' },
      'Invalid target route.'
    ],
    [{ route: '/mosaic/index', markdown: 42 }, 'Invalid page content.']
  ])('rejects invalid input %j without contacting the backend', async (input, message) => {
    const { persistContent } = await loadAction();
    const events = await collect(persistContent(input as never));
    expect(events).toEqual([{ kind: 'error', message }]);
    expect(received).toHaveLength(0);
  });

  it('rejects users who are not editors', async () => {
    isAuthorizedEditorMock.mockReturnValue(false);
    const { persistContent } = await loadAction();
    const events = await collect(persistContent({ route: '/mosaic/index', markdown: '# Hi' }));
    expect(events).toEqual([{ kind: 'error', message: 'You are not allowed to edit this site.' }]);
    expect(received).toHaveLength(0);
  });

  it('refuses to run without a workflows secret', async () => {
    vi.stubEnv('MOSAIC_WORKFLOWS_SECRET', '');
    const { persistContent } = await loadAction();
    const events = await collect(persistContent({ route: '/mosaic/index', markdown: '# Hi' }));
    expect(events).toEqual([
      {
        kind: 'error',
        message: 'MOSAIC_WORKFLOWS_URL and MOSAIC_WORKFLOWS_SECRET must both be configured.'
      }
    ]);
    expect(authMock).not.toHaveBeenCalled();
  });
});
