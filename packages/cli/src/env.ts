/**
 * Environment variables read by `mosaic serve`, checked once when it starts
 * so a bad value stops the server with every problem listed, instead of
 * surfacing later as a feature that silently does nothing.
 *
 * Secrets keep `readSecret()`'s semantics (see `plugins/security.ts`): the
 * public development placeholder counts as unset unless
 * `NODE_ENV=development`. The admin and workflow plugins still read their
 * secrets on each request.
 */
import { z } from 'zod';

export type CliEnv = Record<string, string | undefined>;

export interface ServeEnv {
  /** `MOSAIC_CORS_ORIGINS`, split and trimmed. Empty: no CORS headers. */
  corsOrigins: string[];
  /** Set when `MOSAIC_REVALIDATE_URL` and `MOSAIC_REVALIDATE_SECRET` are. */
  revalidate: { url: string; secret: string } | undefined;
}

/** Thrown by `validateServeEnv()`; the message lists every problem. */
export class InvalidEnvError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(
      [
        'Invalid configuration in environment variables:',
        ...problems.map(problem => `  - ${problem}`)
      ].join('\n')
    );
    this.name = 'InvalidEnvError';
    this.problems = problems;
  }
}

/** Largest delay `setTimeout` honours; longer ones fire immediately. */
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

const isUnset = (value: string | undefined): value is undefined | '' =>
  value === undefined || value === '';

/** An optional variable; `check` returns the problems with a set value. */
function optionalVar(check: (value: string) => string[]) {
  return z
    .string()
    .optional()
    .superRefine((value, ctx) => {
      if (isUnset(value)) return;
      for (const message of check(value)) ctx.addIssue({ code: 'custom', message });
    });
}

const secret = optionalVar(value => (value.trim() === '' ? ['must not be blank'] : []));

const httpUrl = optionalVar(value => {
  try {
    if (['http:', 'https:'].includes(new URL(value).protocol)) return [];
  } catch {
    // Reported below.
  }
  return ['must be an absolute http(s) URL'];
});

function originProblem(entry: string): string | undefined {
  let url: URL;
  try {
    url = new URL(entry);
  } catch {
    return `"${entry}" is not an origin (scheme://host[:port])`;
  }
  const origin = `${url.protocol}//${url.host}`;
  if (url.host !== '' && entry === origin) return undefined;
  return url.host === ''
    ? `"${entry}" is not an origin (scheme://host[:port])`
    : `"${entry}" is not an origin (scheme://host[:port]); use "${origin}"`;
}

const originList = optionalVar(value =>
  splitList(value)
    .map(originProblem)
    .filter((problem): problem is string => problem !== undefined)
);

/** Every rule, keyed by variable. Unknown variables are ignored. */
export const serveEnvSchema = z
  .object({
    MOSAIC_ADMIN_SECRET: secret,
    MOSAIC_WORKFLOWS_SECRET: secret,
    MOSAIC_BITBUCKET_WEBHOOK_SECRET: secret,
    MOSAIC_CORS_ORIGINS: originList,
    MOSAIC_REVALIDATE_URL: httpUrl,
    MOSAIC_REVALIDATE_SECRET: secret,
    MOSAIC_SOURCE_BOOT_TIMEOUT_MS: optionalVar(value =>
      /^\d+$/.test(value) && Number(value) <= MAX_TIMEOUT_MS
        ? []
        : [
            `must be a whole number of milliseconds up to ${MAX_TIMEOUT_MS}, or 0 to wait forever (got "${value}")`
          ]
    ),
    BITBUCKET_API_URL: httpUrl
  })
  .superRefine((env, ctx) => {
    // A secret without a URL is fine: the site and the CLI can share an env
    // file, and the site needs `MOSAIC_REVALIDATE_SECRET` on its own.
    if (!isUnset(env.MOSAIC_REVALIDATE_URL) && isUnset(env.MOSAIC_REVALIDATE_SECRET)) {
      ctx.addIssue({
        code: 'custom',
        path: ['MOSAIC_REVALIDATE_SECRET'],
        message: 'is required when MOSAIC_REVALIDATE_URL is set'
      });
    }
  });

function splitList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
}

/** Every problem with `env`, as `NAME: reason`. Empty when it is valid. */
export function checkServeEnv(env: CliEnv): string[] {
  const result = serveEnvSchema.safeParse(env);
  if (result.success) return [];
  return result.error.issues.map(issue => `${issue.path.map(String).join('.')}: ${issue.message}`);
}

/**
 * Checks `env` (the process env by default) and returns the values `serve`
 * uses. Throws `InvalidEnvError` listing every problem when it is invalid.
 */
export function validateServeEnv(env: CliEnv = process.env): ServeEnv {
  const problems = checkServeEnv(env);
  if (problems.length > 0) throw new InvalidEnvError(problems);
  const url = env.MOSAIC_REVALIDATE_URL;
  const revalidateSecret = env.MOSAIC_REVALIDATE_SECRET;
  return {
    corsOrigins: splitList(env.MOSAIC_CORS_ORIGINS),
    revalidate: url && revalidateSecret ? { url, secret: revalidateSecret } : undefined
  };
}
