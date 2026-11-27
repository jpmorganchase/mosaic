import PluginError from './PluginError.js';

export interface LlmsTxtScope {
  /** Public URL prefix, independent of the source namespace. */
  path: string;
  title?: string;
  description?: string;
}

export function normalizeScopes(scopes: LlmsTxtScope[] = []): LlmsTxtScope[] {
  if (!Array.isArray(scopes)) throw new PluginError('llms.txt scopes must be an array');
  const seen = new Set<string>();
  return scopes
    .map(scope => {
      const value = typeof scope?.path === 'string' ? scope.path : '';
      const normalized = value.toLowerCase().replace(/\/+$/, '');
      // Match Mosaic's case-insensitive public routes. Require URL-safe path
      // segments; never interpret encoded separators, dot segments or URL parts.
      if (
        !/^\/(?:[a-z0-9_~-][a-z0-9._~-]*)(?:\/[a-z0-9_~-][a-z0-9._~-]*)*$/.test(normalized) ||
        /^\/(?:api|_next)(?:\/|$)/.test(normalized) ||
        normalized
          .split('/')
          .some(segment =>
            /^(?:llms(?:-full)?\.txt|llms-manifest\.json|markdown-pages\.json)$/.test(segment)
          )
      ) {
        throw new PluginError(`Invalid llms.txt scope path: ${JSON.stringify(value)}`);
      }
      if (seen.has(normalized))
        throw new PluginError(`Duplicate llms.txt scope path: ${normalized}`);
      seen.add(normalized);
      return { ...scope, path: normalized };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

export const withinScope = (route: string, scope: string) =>
  route.toLowerCase() === scope || route.toLowerCase().startsWith(`${scope}/`);

export function mostSpecificScope(route: string, scopes: LlmsTxtScope[]) {
  return scopes.reduce<string>(
    (best, scope) =>
      scope.path.length > best.length && withinScope(route, scope.path) ? scope.path : best,
    ''
  );
}
