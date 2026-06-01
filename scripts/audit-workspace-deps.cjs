#!/usr/bin/env node
/**
 * Workspace dependency audit — catches "Module not found" failures
 * BEFORE they hit Vercel / Docker / CI (strict-install environments
 * where there's no hoisted parent `node_modules` to fall back to).
 *
 * For each `packages/*` workspace, scan `src/` and `scripts/` for
 * actual ESM/CJS imports and report any bare-specifier imports that
 * aren't declared in the workspace's `package.json`
 * (dependencies / devDependencies / peerDependencies /
 * optionalDependencies).
 *
 * Only counts genuine import / require / re-export statements — not
 * string literals (e.g. `modulePath: '...'`), JSDoc comments, or
 * markdown code blocks. Subpath imports (`pkg/foo/bar`) are reduced
 * to their package root (`pkg` or `@scope/pkg`) for comparison.
 *
 * Run after any package movement, refactor, or env-var audit that
 * touched a package.json file. Wire into CI to fail the build on
 * regressions.
 *
 * Flags:
 *   --scope=<pkg>     Limit to one workspace (e.g. `--scope=site`).
 *   --include-tests   Also scan `__tests__/` directories.
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const args = new Set(process.argv.slice(2));
const scopeArg = [...args].find(a => a.startsWith('--scope='));
const scopeOnly = scopeArg ? scopeArg.slice('--scope='.length) : null;
const includeTests = args.has('--include-tests');
const root = path.resolve(__dirname, '..');
const pkgsDir = path.join(root, 'packages');
const NODE_BUILTINS = new Set([
  'assert',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'diagnostics_channel',
  'dns',
  'domain',
  'events',
  'fs',
  'fs/promises',
  'http',
  'http2',
  'https',
  'inspector',
  'module',
  'net',
  'os',
  'path',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'stream/consumers',
  'stream/promises',
  'stream/web',
  'string_decoder',
  'sys',
  'test',
  'timers',
  'timers/promises',
  'tls',
  'trace_events',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'wasi',
  'worker_threads',
  'zlib'
]);
const IGNORED_PREFIXES = ['.', '/', '#', 'private-next-', 'next/dist/', 'virtual:'];
const IMPORT_RE =
  /(?:^|[\s;{(])(?:import\s+(?:[^'"`;]*\s+from\s+)?|import\s*\(\s*|require\s*\(\s*|export\s+(?:\*|\{[^}]*\}|[^'"`;]*)\s+from\s+)['"`]([^'"`]+)['"`]/gm;
function packageRoot(spec) {
  if (spec.startsWith('@')) {
    const [scope, name] = spec.split('/');
    return name ? scope + '/' + name : scope;
  }
  return spec.split('/')[0];
}
function shouldIgnore(spec) {
  if (!spec) return true;
  if (IGNORED_PREFIXES.some(p => spec.startsWith(p))) return true;
  const r = packageRoot(spec);
  if (r.startsWith('node:')) return true;
  if (NODE_BUILTINS.has(r)) return true;
  return false;
}
function stripComments(src) {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.replace(/(^|[^:])\/\/.*$/gm, '$1');
  return out;
}
let totalMissing = 0;
for (const name of fs.readdirSync(pkgsDir).sort()) {
  if (scopeOnly && name !== scopeOnly) continue;
  const dir = path.join(pkgsDir, name);
  const pkgPath = path.join(dir, 'package.json');
  if (!fs.existsSync(pkgPath)) continue;
  const p = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const self = p.name;
  const listed = new Set(
    Object.keys({
      ...(p.dependencies || {}),
      ...(p.devDependencies || {}),
      ...(p.peerDependencies || {}),
      ...(p.optionalDependencies || {})
    })
  );
  const dirsToScan = ['src', 'scripts'].map(d => path.join(dir, d)).filter(d => fs.existsSync(d));
  if (dirsToScan.length === 0) continue;
  let files;
  try {
    const notTests = includeTests ? '' : "-not -path '*/__tests__/*'";
    files = cp
      .execSync(
        `find ${dirsToScan
          .map(d => "'" + d + "'")
          .join(
            ' '
          )} -type f \\( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.mjs' -o -name '*.cjs' \\) ${notTests} -not -path '*/dist/*' -not -path '*/.next/*' 2>/dev/null`,
        { encoding: 'utf8' }
      )
      .split('\n')
      .filter(Boolean);
  } catch {
    files = [];
  }
  const imports = new Map();
  for (const file of files) {
    let src;
    try {
      src = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    src = stripComments(src);
    let m;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(src)) !== null) {
      const spec = m[1].trim();
      if (shouldIgnore(spec)) continue;
      const r = packageRoot(spec);
      if (r === self) continue;
      if (!imports.has(r)) imports.set(r, new Set());
      imports.get(r).add(path.relative(process.cwd(), file));
    }
  }
  const missing = [...imports.keys()].filter(i => {
    if (listed.has(i)) return false;
    // A bare specifier like `mdast`, `unist`, `hast` is satisfied by a
    // declared `@types/<name>` package (TypeScript resolves the import
    // via the @types definitions; there's no runtime package needed
    // because the imports are type-only).
    if (listed.has('@types/' + i)) return false;
    return true;
  });
  if (missing.length) {
    console.log(`=== ${name} (${self}) MISSING ===`);
    for (const m of missing) {
      const sites = [...imports.get(m)];
      console.log('  ' + m);
      for (const s of sites.slice(0, 3)) console.log('      ' + s);
      if (sites.length > 3) console.log('      … +' + (sites.length - 3) + ' more');
    }
    totalMissing += missing.length;
  }
}
if (totalMissing === 0) {
  console.log('All workspace deps are declared.');
} else {
  console.log('\nTotal missing: ' + totalMissing);
  process.exit(1);
}
