#!/usr/bin/env node
/**
 * Workspace dependency audit.
 *
 * For each `packages/*` workspace, scan `src/` and `scripts/` for
 * actual ESM/CJS imports of `@jpmorganchase/mosaic-*` siblings and
 * report any that aren't declared in the workspace's `package.json`
 * (dependencies / devDependencies / peerDependencies).
 *
 * Only counts genuine import / require / re-export statements — not
 * string literals (e.g. `modulePath: '...'`), JSDoc comments, or
 * markdown code blocks. Run after any package movement, refactor, or
 * env-var audit that touched package.json files.
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.resolve(__dirname, '..');
const pkgsDir = path.join(root, 'packages');
let totalMissing = 0;

// Matches: import ... from '@jpmorganchase/mosaic-xxx[/...]'
//          import('@jpmorganchase/mosaic-xxx[/...]')
//          require('@jpmorganchase/mosaic-xxx[/...]')
//          export ... from '@jpmorganchase/mosaic-xxx[/...]'
const IMPORT_RE =
  /(?:^|\s)(?:import\s[^'";]*from\s+|import\s*\(\s*|require\s*\(\s*|export\s[^'";]*from\s+)['"](@jpmorganchase\/mosaic-[a-z0-9-]+)/gm;

for (const name of fs.readdirSync(pkgsDir).sort()) {
  const dir = path.join(pkgsDir, name);
  const pkgPath = path.join(dir, 'package.json');
  if (!fs.existsSync(pkgPath)) continue;
  const p = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const self = p.name;
  const listed = new Set(
    Object.keys({
      ...(p.dependencies || {}),
      ...(p.devDependencies || {}),
      ...(p.peerDependencies || {})
    })
  );
  const dirsToScan = ['src', 'scripts'].map(d => path.join(dir, d)).filter(d => fs.existsSync(d));
  if (dirsToScan.length === 0) continue;

  // Find all .ts/.tsx/.js/.jsx/.mjs/.cjs files (excluding test/dist) and scan.
  const imports = new Set();
  let files;
  try {
    files = cp
      .execSync(
        `find ${dirsToScan
          .map(d => `'${d}'`)
          .join(
            ' '
          )} -type f \\( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.mjs' -o -name '*.cjs' \\) -not -path '*/__tests__/*' -not -path '*/dist/*' 2>/dev/null`,
        { encoding: 'utf8' }
      )
      .split('\n')
      .filter(Boolean);
  } catch {
    files = [];
  }
  for (const file of files) {
    let src;
    try {
      src = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    let m;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(src)) !== null) {
      imports.add(m[1]);
    }
  }
  const missing = [...imports].filter(i => i !== self && !listed.has(i));
  if (missing.length) {
    console.log(`=== ${name} (${self}) MISSING ===`);
    for (const m of missing) console.log(`  ${m}`);
    totalMissing += missing.length;
  }
}

if (totalMissing === 0) {
  console.log('All workspace deps are declared.');
} else {
  console.log(`\nTotal missing: ${totalMissing}`);
  process.exit(1);
}
