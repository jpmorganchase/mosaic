/**
 * The site's configuration, read from environment variables.
 *
 * Env vars stay the source of truth; this module is the one place that
 * checks them. `validateSiteConfig()` runs once when the server starts
 * (from `src/instrumentation.ts`) and `getSiteConfig()` gives server code
 * typed values.
 *
 * Validation runs when a server starts (`next start`, `next dev`, the
 * standalone `server.js`), not during `next build`, so an image can be
 * built without its runtime secrets. With `NODE_ENV=production` an invalid
 * configuration throws one error listing every problem and the server
 * exits; in development the same list is logged and the server keeps
 * running.
 *
 * `getSiteConfig()` maps the values exactly as the code did before this
 * module existed (for example, a flag is on only when it is `true`), so a
 * valid configuration behaves as before and an invalid one only changes
 * whether the server may start.
 *
 * Server-only: it reads non-public env vars. Client code must keep literal
 * `process.env.NEXT_PUBLIC_*` reads, which Next.js inlines into the
 * browser bundle.
 */
import type { MosaicMode } from '@jpmorganchase/mosaic-types';
import { z } from 'zod';

if (typeof window !== 'undefined') {
  throw new Error('lib/config.ts must not be imported on the client.');
}

export type SiteEnv = Record<string, string | undefined>;

export interface SiteConfig {
  /** `MOSAIC_MODE`; `active` when unset. */
  mode: MosaicMode;
  /** `MOSAIC_OUTPUT=export`: the static-export build. */
  staticExport: boolean;
  /** `NEXT_PUBLIC_SITE_URL` as inlined at build time. */
  siteUrl: string | undefined;
  auth: {
    /** `MOSAIC_AUTH_ENABLED=true`. */
    explicitlyEnabled: boolean;
    /**
     * `AUTH_SECRET`, or the legacy `NEXTAUTH_SECRET`. `undefined` when it
     * is unset or is the development placeholder in production.
     */
    secret: string | undefined;
    /** The development placeholder was set in production and is ignored. */
    secretIsPlaceholder: boolean;
    /** `GITHUB_ID`. */
    githubId: string | undefined;
    /** `GITHUB_SECRET`. */
    githubSecret: string | undefined;
    /**
     * `MOSAIC_EDITORS`, lower-cased with empty entries dropped.
     * `undefined` when the variable is unset or blank.
     */
    editors: string[] | undefined;
  };
  revalidate: {
    /**
     * `MOSAIC_REVALIDATE_SECRET`. `undefined` when it is unset or is the
     * development placeholder in production.
     */
    secret: string | undefined;
    /** The development placeholder was set in production and is ignored. */
    secretIsPlaceholder: boolean;
  };
  workflows: {
    /** `MOSAIC_WORKFLOWS_URL`; empty when unset. */
    url: string;
    /** `MOSAIC_WORKFLOWS_SECRET`; empty when unset. */
    secret: string;
  };
  /** Development-only switches. Callers still check `NODE_ENV`. */
  dev: {
    /** `MOSAIC_DEV_FAKE_AUTH=true`. */
    fakeAuth: boolean;
    /** `MOSAIC_DEV_BYPASS_CAPABILITY_GATE=true`. */
    bypassCapabilityGate: boolean;
  };
}

const MOSAIC_MODES: readonly MosaicMode[] = ['active', 'snapshot-file'];

const MOSAIC_OUTPUTS = ['export', 'standalone'] as const;

/**
 * Public placeholder secrets committed in `.env.development`. With
 * `NODE_ENV=production` they are treated as unset: a deployment that copied
 * one would otherwise let anyone forge session cookies or flush the cache.
 */
const DEV_PLACEHOLDER_AUTH_SECRETS = new Set(['local-dev-auth-secret-not-for-production']);
const DEV_PLACEHOLDER_REVALIDATE_SECRETS = new Set(['local-dev-not-a-secret']);

const isUnset = (value: string | undefined): value is undefined | '' =>
  value === undefined || value === '';

function hasProtocol(value: string, protocols: readonly string[]): boolean {
  try {
    return protocols.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

/** An optional variable; `check` returns the problem with a set value, if any. */
function optionalVar(check: (value: string) => string | undefined) {
  return z
    .string()
    .optional()
    .superRefine((value, ctx) => {
      if (isUnset(value)) return;
      const problem = check(value);
      if (problem) ctx.addIssue({ code: 'custom', message: problem });
    });
}

const booleanFlag = optionalVar(value =>
  value === 'true' || value === 'false' ? undefined : `must be "true" or "false" (got "${value}")`
);

const oneOf = (values: readonly string[]) =>
  optionalVar(value =>
    values.includes(value) ? undefined : `must be one of ${values.join(', ')} (got "${value}")`
  );

const httpUrl = optionalVar(value =>
  hasProtocol(value, ['http:', 'https:']) ? undefined : 'must be an absolute http(s) URL'
);

const EMAIL = /^[^\s@,*]+@[^\s@,]+$/;
const DOMAIN = /^@[^\s@,]+$/;

const editorList = optionalVar(value => {
  const invalid = value
    .split(',')
    .map(entry => entry.trim())
    .filter(entry => entry !== '' && entry !== '*' && !DOMAIN.test(entry) && !EMAIL.test(entry));
  if (invalid.length === 0) return undefined;
  const entries = invalid.map(entry => `"${entry}"`).join(', ');
  return `${entries} ${invalid.length === 1 ? 'is' : 'are'} not an email address, an @domain or *`;
});

/** Every rule, keyed by variable. Unknown variables are ignored. */
export const siteEnvSchema = z
  .object({
    MOSAIC_MODE: oneOf(MOSAIC_MODES),
    MOSAIC_OUTPUT: oneOf(MOSAIC_OUTPUTS),
    MOSAIC_ACTIVE_MODE_URL: httpUrl,
    MOSAIC_SNAPSHOT_DIR: z.string().optional(),
    MOSAIC_ACTIVE_MODE_CACHE: booleanFlag,
    MOSAIC_DISABLE_LOADER_CACHE: booleanFlag,
    NEXT_PUBLIC_SITE_URL: httpUrl,
    NEXT_PUBLIC_ENABLE_LOGIN: booleanFlag,
    NEXT_PUBLIC_OPTIMIZE_IMAGES: booleanFlag,
    MOSAIC_AUTH_ENABLED: booleanFlag,
    MOSAIC_EDITORS: editorList,
    MOSAIC_WORKFLOWS_URL: optionalVar(value =>
      hasProtocol(value, ['ws:', 'wss:', 'http:', 'https:'])
        ? undefined
        : 'must be an absolute ws(s) or http(s) URL'
    ),
    MOSAIC_WORKFLOWS_SECRET: z.string().optional(),
    MOSAIC_DEV_FAKE_AUTH: booleanFlag,
    MOSAIC_DEV_BYPASS_CAPABILITY_GATE: booleanFlag
  })
  .superRefine((env, ctx) => {
    const requireVar = (name: keyof typeof env, when: string) => {
      if (isUnset(env[name])) {
        ctx.addIssue({ code: 'custom', path: [name], message: `is required ${when}` });
      }
    };
    const mode = env.MOSAIC_MODE || 'active';
    const modeWhen = `when MOSAIC_MODE is ${mode}${env.MOSAIC_MODE ? '' : ' (the default)'}`;
    if (mode === 'active') requireVar('MOSAIC_ACTIVE_MODE_URL', modeWhen);
    if (mode === 'snapshot-file') requireVar('MOSAIC_SNAPSHOT_DIR', modeWhen);
    if (!isUnset(env.MOSAIC_WORKFLOWS_URL)) {
      requireVar('MOSAIC_WORKFLOWS_SECRET', 'when MOSAIC_WORKFLOWS_URL is set');
    }
  });

/** Every problem with `env`, as `NAME: reason`. Empty when it is valid. */
export function checkSiteEnv(env: SiteEnv): string[] {
  const result = siteEnvSchema.safeParse(env);
  if (result.success) return [];
  return result.error.issues.map(issue => `${issue.path.map(String).join('.')}: ${issue.message}`);
}

/** Maps `env` to typed values, with the same semantics the call sites always had. */
export function readSiteConfig(env: SiteEnv): SiteConfig {
  const production = env.NODE_ENV === 'production';

  const authSecret = env.AUTH_SECRET ?? env.NEXTAUTH_SECRET;
  const authSecretIsPlaceholder =
    production && authSecret !== undefined && DEV_PLACEHOLDER_AUTH_SECRETS.has(authSecret);

  const revalidateSecret = env.MOSAIC_REVALIDATE_SECRET;
  const revalidateSecretIsPlaceholder =
    production &&
    revalidateSecret !== undefined &&
    DEV_PLACEHOLDER_REVALIDATE_SECRETS.has(revalidateSecret);

  const editors = env.MOSAIC_EDITORS?.trim();

  return {
    mode: (env.MOSAIC_MODE || 'active') as MosaicMode,
    staticExport: env.MOSAIC_OUTPUT === 'export',
    siteUrl: env.NEXT_PUBLIC_SITE_URL,
    auth: {
      explicitlyEnabled: env.MOSAIC_AUTH_ENABLED === 'true',
      secret: authSecretIsPlaceholder ? undefined : authSecret,
      secretIsPlaceholder: authSecretIsPlaceholder,
      githubId: env.GITHUB_ID,
      githubSecret: env.GITHUB_SECRET,
      editors: editors
        ? editors
            .split(',')
            .map(entry => entry.trim().toLowerCase())
            .filter(Boolean)
        : undefined
    },
    revalidate: {
      secret: revalidateSecretIsPlaceholder ? undefined : revalidateSecret,
      secretIsPlaceholder: revalidateSecretIsPlaceholder
    },
    workflows: {
      url: env.MOSAIC_WORKFLOWS_URL ?? '',
      secret: env.MOSAIC_WORKFLOWS_SECRET ?? ''
    },
    dev: {
      fakeAuth: env.MOSAIC_DEV_FAKE_AUTH === 'true',
      bypassCapabilityGate: env.MOSAIC_DEV_BYPASS_CAPABILITY_GATE === 'true'
    }
  };
}

/**
 * The process env, with literal reads for the values Next.js inlines at
 * build time so the config sees what the rest of the app uses.
 */
function processEnv(): SiteEnv {
  return {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_ENABLE_LOGIN: process.env.NEXT_PUBLIC_ENABLE_LOGIN,
    NEXT_PUBLIC_OPTIMIZE_IMAGES: process.env.NEXT_PUBLIC_OPTIMIZE_IMAGES
  };
}

let cachedConfig: SiteConfig | undefined;

/** The site's typed configuration, read once per server module graph. */
export function getSiteConfig(): SiteConfig {
  cachedConfig ??= readSiteConfig(processEnv());
  return cachedConfig;
}

/**
 * Checks `env` (the process env by default). With `NODE_ENV=production` an
 * invalid configuration throws one error listing every problem; otherwise
 * the list is logged with `console.error` and the config is returned.
 */
export function validateSiteConfig(env: SiteEnv = processEnv()): SiteConfig {
  const problems = checkSiteEnv(env);
  if (problems.length > 0) {
    const message = [
      '[mosaic-site] Invalid configuration in environment variables:',
      ...problems.map(problem => `  - ${problem}`)
    ].join('\n');
    if (env.NODE_ENV === 'production') throw new Error(message);
    console.error(`${message}\nContinuing because NODE_ENV is not production.`);
  }
  return readSiteConfig(env);
}
