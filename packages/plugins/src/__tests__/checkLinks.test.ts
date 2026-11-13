import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { MockAgent, ProxyAgent } from 'undici';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { checkLinks } from '../utils/checkLinks.js';

const requests: string[] = [];
const failuresLeft = new Map<string, number>();
let inFlight = 0;
let maxInFlight = 0;

const server = http.createServer((req, res) => {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  requests.push(`${req.method} ${path}`);
  inFlight += 1;
  maxInFlight = Math.max(maxInFlight, inFlight);
  const send = (status: number, headers: http.OutgoingHttpHeaders = {}) =>
    setTimeout(() => {
      inFlight -= 1;
      res.writeHead(status, headers).end(status === 200 ? 'ok' : '');
    }, 5);

  if (path.startsWith('/ok')) return send(200);
  if (path === '/no-head') return send(req.method === 'HEAD' ? 405 : 200);
  if (path === '/redirect') return send(301, { location: '/ok-redirected' });
  if (path === '/redirect-https') {
    return send(302, { location: 'https://proxy-only.invalid/ok' });
  }
  if (path === '/redirect-https-no-head') {
    return send(307, { location: 'https://proxy-only.invalid/no-head' });
  }
  if (path === '/missing') return send(404);
  if (path.startsWith('/flaky') || path === '/down') {
    const left = failuresLeft.get(path) ?? 0;
    failuresLeft.set(path, left - 1);
    return send(left > 0 ? 503 : 200);
  }
  return send(500);
});
let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

const requestsFor = (path: string) => requests.filter(request => request.endsWith(` ${path}`));
const options = { retryDelayMs: 1 };

describe('GIVEN checkLinks', () => {
  test('THEN reachable links are alive, falling back to GET and following redirects', async () => {
    const links = [`${baseUrl}/ok`, `${baseUrl}/no-head`, `${baseUrl}/redirect`];

    expect(await checkLinks(links, options)).toEqual({
      [links[0]]: { status: 'alive', statusCode: 200 },
      [links[1]]: { status: 'alive', statusCode: 200 },
      [links[2]]: { status: 'alive', statusCode: 200 }
    });
    expect(requestsFor('/ok')).toEqual(['HEAD /ok']);
    expect(requestsFor('/no-head')).toEqual(['HEAD /no-head', 'GET /no-head']);
  });

  test('THEN a missing page is dead and not retried', async () => {
    const link = `${baseUrl}/missing`;

    expect(await checkLinks([link], options)).toEqual({
      [link]: { status: 'dead', statusCode: 404 }
    });
    expect(requestsFor('/missing')).toEqual(['HEAD /missing', 'GET /missing']);
  });

  test('THEN a temporary failure is retried and a lasting one is dead', async () => {
    failuresLeft.set('/flaky', 2);
    failuresLeft.set('/down', 10);
    const flaky = `${baseUrl}/flaky`;
    const down = `${baseUrl}/down`;

    expect(await checkLinks([flaky, down], options)).toEqual({
      [flaky]: { status: 'alive', statusCode: 200 },
      [down]: { status: 'dead', statusCode: 503 }
    });
    expect(requestsFor('/down')).toEqual(['HEAD /down', 'GET /down', 'GET /down', 'GET /down']);
  });

  test('THEN an unreachable link is dead', async () => {
    const closed = http.createServer();
    await new Promise<void>(resolve => closed.listen(0, '127.0.0.1', resolve));
    const link = `http://127.0.0.1:${(closed.address() as AddressInfo).port}/gone`;
    await new Promise(resolve => closed.close(resolve));

    expect(await checkLinks([link], options)).toEqual({ [link]: { status: 'dead' } });
  });

  test('THEN non-HTTP and malformed links are invalid without a request', async () => {
    const count = requests.length;

    expect(
      await checkLinks(['mailto:team@example.com', 'ftp://example.com/a', 'not a url'])
    ).toEqual({
      'mailto:team@example.com': { status: 'invalid' },
      'ftp://example.com/a': { status: 'invalid' },
      'not a url': { status: 'invalid' }
    });
    expect(requests).toHaveLength(count);
  });

  test('THEN a link checked again within a minute is not requested again', async () => {
    const link = `${baseUrl}/ok-cached`;

    await checkLinks([link], options);
    await checkLinks([link], options);

    expect(requestsFor('/ok-cached')).toEqual(['HEAD /ok-cached']);
  });

  test('THEN only `concurrency` links are checked at once', async () => {
    maxInFlight = 0;
    const links = Array.from({ length: 6 }, (_, index) => `${baseUrl}/ok-concurrency-${index}`);

    await checkLinks(links, { ...options, concurrency: 2 });

    expect(maxInFlight).toBe(2);
  });

  test('THEN `http:` links bypass the proxy, which only applies to `https:` links', async () => {
    const link = `${baseUrl}/ok-no-proxy`;

    expect(await checkLinks([link], { ...options, proxyEndpoint: 'http://127.0.0.1:1' })).toEqual({
      [link]: { status: 'alive', statusCode: 200 }
    });
  });

  test('THEN HTTP-to-HTTPS redirects select the proxy for HEAD and the GET fallback', async () => {
    const proxy = new MockAgent();
    proxy.disableNetConnect();
    const destination = proxy.get('https://proxy-only.invalid');
    destination.intercept({ path: '/ok', method: 'HEAD' }).reply(200);
    destination.intercept({ path: '/no-head', method: 'HEAD' }).reply(405);
    destination.intercept({ path: '/no-head', method: 'GET' }).reply(200);
    // Keep real fetch redirect handling and the direct HTTP connection. Only
    // replace the proxy transport, so this fails if redirects bypass it.
    const dispatch = vi
      .spyOn(ProxyAgent.prototype, 'dispatch')
      .mockImplementation((options, handler) => proxy.dispatch(options, handler));
    try {
      const links = [`${baseUrl}/redirect-https`, `${baseUrl}/redirect-https-no-head`];
      expect(await checkLinks(links, { ...options, proxyEndpoint: 'http://127.0.0.1:1' })).toEqual({
        [links[0]]: { status: 'alive', statusCode: 200 },
        [links[1]]: { status: 'alive', statusCode: 200 }
      });
      expect(dispatch).toHaveBeenCalledTimes(3);
      proxy.assertNoPendingInterceptors();
    } finally {
      dispatch.mockRestore();
      await proxy.close();
    }
  });

  test('THEN an HTTPS-to-HTTP redirect leaves the proxy and follows a relative redirect', async () => {
    const proxy = new MockAgent();
    proxy.disableNetConnect();
    proxy
      .get('https://proxy-only.invalid')
      .intercept({ path: '/back-to-http', method: 'HEAD' })
      .reply(302, '', { headers: { location: `${baseUrl}/redirect` } });
    const dispatch = vi
      .spyOn(ProxyAgent.prototype, 'dispatch')
      .mockImplementation((options, handler) => proxy.dispatch(options, handler));
    try {
      const link = 'https://proxy-only.invalid/back-to-http';
      expect(await checkLinks([link], { ...options, proxyEndpoint: 'http://127.0.0.1:1' })).toEqual(
        { [link]: { status: 'alive', statusCode: 200 } }
      );
      expect(dispatch).toHaveBeenCalledTimes(1);
      proxy.assertNoPendingInterceptors();
    } finally {
      dispatch.mockRestore();
      await proxy.close();
    }
  });
});
