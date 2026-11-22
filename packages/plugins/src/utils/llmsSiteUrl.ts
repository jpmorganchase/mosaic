import PluginError from './PluginError.js';

// The rule the site middleware applies to the manifest's `siteUrl`.
const SITE_URL = /^https?:\/\/[^\s<>"?#]+$/;

/**
 * Trims `siteUrl`, lower-cases its scheme and host and removes trailing
 * slashes, so every link and the discovery manifest use the same origin.
 * Blank values mean links stay root-relative.
 */
export function normalizeSiteUrl(siteUrl?: string): string | undefined {
  if (siteUrl === undefined || siteUrl === null) return undefined;
  const value = typeof siteUrl === 'string' ? siteUrl.trim() : undefined;
  if (value === '') return undefined;
  let url: URL | undefined;
  try {
    url = value === undefined || /[\s<>"\\]/.test(value) ? undefined : new URL(value);
  } catch {
    url = undefined;
  }
  const normalized = url?.href.replace(/\/+$/, '');
  if (
    !url ||
    !normalized ||
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username !== '' ||
    url.password !== '' ||
    !SITE_URL.test(normalized)
  ) {
    throw new PluginError(
      `Invalid llms.txt siteUrl: ${JSON.stringify(siteUrl)}. Use an absolute http(s) URL ` +
        'without credentials, a query or a fragment, such as "https://example.com".'
    );
  }
  return normalized;
}
