import { setTimeout as delay } from 'node:timers/promises';
import { Agent, ProxyAgent, fetch, type Dispatcher } from 'undici';

export type LinkStatus = 'alive' | 'dead' | 'invalid';

export interface LinkCheckResult {
  status: LinkStatus;
  statusCode?: number;
}

export interface CheckLinksOptions {
  /** Proxy for `https:` links. `http:` links, such as the site's own base URL, are fetched directly. */
  proxyEndpoint?: string;
  concurrency?: number;
  timeoutMs?: number;
  /** Delay before the first GET retry; later retries double it. */
  retryDelayMs?: number;
}

const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9'
};
const RETRY_STATUSES = new Set([408, 413, 429, 500, 502, 503, 504, 521, 522, 524]);
const GET_RETRIES = 2;
const CACHE_TTL_MS = 60_000;

// A link check only needs to know that the page responds, so, like the
// `check-links` package this replaces, accept self-signed certificates.
const directAgent = new Agent({ connect: { rejectUnauthorized: false } });
const proxyAgents = new Map<string, ProxyAgent>();
const cache = new Map<string, { expires: number; result: Promise<LinkCheckResult> }>();

function dispatcherFor(url: URL, proxyEndpoint?: string): Dispatcher {
  if (url.protocol !== 'https:' || !proxyEndpoint) {
    return directAgent;
  }
  let agent = proxyAgents.get(proxyEndpoint);
  if (!agent) {
    agent = new ProxyAgent(proxyEndpoint);
    proxyAgents.set(proxyEndpoint, agent);
  }
  return agent;
}

const isAlive = (statusCode: number) =>
  (statusCode >= 200 && statusCode < 300) || statusCode === 304;

async function request(
  url: URL,
  method: 'HEAD' | 'GET',
  dispatcher: Dispatcher,
  timeoutMs: number
) {
  const response = await fetch(url, {
    method,
    headers: HEADERS,
    redirect: 'follow',
    dispatcher,
    signal: AbortSignal.timeout(timeoutMs)
  });
  // Only the status matters; don't download the page.
  await response.body?.cancel();
  return response.status;
}

async function checkLink(
  link: string,
  { proxyEndpoint, timeoutMs = 30_000, retryDelayMs = 1_000 }: CheckLinksOptions
): Promise<LinkCheckResult> {
  const url = URL.parse(link);
  if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
    return { status: 'invalid' };
  }
  const dispatcher = dispatcherFor(url, proxyEndpoint);

  // HEAD is cheap but some servers reject it, so fall back to GET, which is
  // retried when the failure looks temporary.
  try {
    const statusCode = await request(url, 'HEAD', dispatcher, timeoutMs);
    if (isAlive(statusCode)) {
      return { status: 'alive', statusCode };
    }
  } catch {
    // Fall back to GET.
  }

  let statusCode: number | undefined;
  for (let attempt = 0; attempt <= GET_RETRIES; attempt += 1) {
    if (attempt > 0) {
      await delay(retryDelayMs * 2 ** (attempt - 1));
    }
    try {
      statusCode = await request(url, 'GET', dispatcher, timeoutMs);
      if (isAlive(statusCode)) {
        return { status: 'alive', statusCode };
      }
      if (!RETRY_STATUSES.has(statusCode)) {
        break;
      }
    } catch {
      statusCode = undefined;
    }
  }
  return { status: 'dead', statusCode };
}

function checkLinkCached(link: string, options: CheckLinksOptions) {
  const now = Date.now();
  const cached = cache.get(link);
  if (cached && cached.expires > now) {
    return cached.result;
  }
  const result = checkLink(link, options);
  cache.set(link, { expires: now + CACHE_TTL_MS, result });
  return result;
}

/**
 * Checks whether each link responds with a successful status. Results are
 * cached for a minute, because many pages link to the same URLs.
 */
export async function checkLinks(
  links: string[],
  options: CheckLinksOptions = {}
): Promise<Record<string, LinkCheckResult>> {
  const now = Date.now();
  for (const [link, { expires }] of cache) {
    if (expires <= now) {
      cache.delete(link);
    }
  }

  const results: Record<string, LinkCheckResult> = {};
  let next = 0;
  const worker = async () => {
    while (next < links.length) {
      const link = links[next];
      next += 1;
      results[link] = await checkLinkCached(link, options);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(options.concurrency ?? 8, links.length) }, worker)
  );
  return results;
}
