/**
 * Phase 0 — headless smoke test for the Extension API authoring layer.
 *
 * Goal: prove that each of our `defineExtension(...)` objects can be
 * fed through `buildEditorFromExtensions` to construct a real
 * LexicalEditor instance at our pinned `lexical@0.45.0`, without the
 * React component wrappers in between. Catches three classes of
 * regression before they hit the runtime editor:
 *
 *   1. Extension API surface mismatch (e.g. upstream renames the
 *      `register` signature or the `name` property contract).
 *   2. Command symbol drift (an extension referencing
 *      `INSERT_*_COMMAND` from a stale source location).
 *   3. Dispose ordering bugs (the register-returned unregister
 *      function throwing during `editor.dispose()`).
 *
 * The test is deliberately NOT a Vitest suite — adding the editor
 * plugin to the Vitest project discovery would force jsdom +
 * identity-obj-proxy + ReactLive wiring overhead just to instantiate
 * a headless editor. A plain Node script run via `yarn extensions:smoke`
 * is the smallest hammer that gets us the regression net.
 *
 * Run from the plugin package:
 *   yarn extensions:smoke
 *
 * Or from the workspace root:
 *   yarn workspace @jpmorganchase/mosaic-content-editor-plugin extensions:smoke
 *
 * Exits 0 on success, 1 on any thrown error (so CI can wire it
 * straight into a pre-merge gate later without parsing stdout).
 */

import { buildEditorFromExtensions } from '@lexical/extension';
import { defineExtension } from 'lexical';

// NOTE: imports go directly to each extension file with the explicit
// `.ts` extension. Node's `--experimental-strip-types` resolver does
// not synthesize the `.ts` extension the way `tsc` / our bundler do,
// so importing through `src/extensions/index.ts` (which uses
// extensionless re-exports for TypeScript / esbuild compatibility)
// fails with `ERR_MODULE_NOT_FOUND`. Direct imports side-step the
// barrel without forcing us to choose between Node and tsc.
import { HorizontalRuleExtension } from '../src/extensions/HorizontalRuleExtension.ts';
import { MarkdownImageExtension } from '../src/extensions/MarkdownImageExtension.ts';
import { MarkdownLinkExtension } from '../src/extensions/MarkdownLinkExtension.ts';
// Phase 0c — `DirtyTrackerExtension` and `ErrorHighlightExtension`
// are deliberately NOT smoke-tested here. Both transitively import
// from `../src/EditorContext` and `../src/utils/focusErrorRegistry`,
// which use extensionless intra-source imports (correct for tsc +
// esbuild). Node's `--experimental-strip-types` resolver doesn't
// synthesize the `.ts` extension on transitive imports, so loading
// either extension here fails with `ERR_MODULE_NOT_FOUND` on the
// first hop into shared utilities. Switching to a TS loader (tsx,
// @swc-node/register) would fix it at the cost of a new dev dep and
// a script-runner choice that's load-bearing for one file. Not
// worth it: the Phase-0c extensions get stronger runtime coverage
// from the live editor mounting their `register*` helpers (see
// `../src/plugins/DirtyTrackerPlugin.tsx`,
// `../src/plugins/ErrorHighlightPlugin.tsx`), which exercises the
// exact same code paths the smoke would have covered.

interface SmokeResult {
  name: string;
  ok: boolean;
  detail?: string;
}

function runSmoke(
  extensionName: string,
  extension: Parameters<typeof buildEditorFromExtensions>[0]
): SmokeResult {
  try {
    // Wrap in a root extension because `buildEditorFromExtensions`
    // requires the top-level extension to act as the "[root]" — using
    // our plugin extensions directly as the root works for a single
    // extension, but the playground convention is to always nest under
    // a named root. Mirroring that convention here means the smoke
    // script's shape matches what Phase 2 will look like.
    const root = defineExtension({
      name: `mosaic/smoke-root/${extensionName}`,
      dependencies: [extension]
    });
    const editor = buildEditorFromExtensions(root);
    // Touch the editor instance to ensure the extension's register
    // hook ran without throwing. `getEditorState()` is a cheap
    // accessor that requires the editor to be fully constructed.
    editor.getEditorState();
    // Dispose. If the extension's register returned a broken
    // unregister function, this throws.
    editor.dispose();
    return { name: extensionName, ok: true };
  } catch (err) {
    return {
      name: extensionName,
      ok: false,
      detail: err instanceof Error ? `${err.message}\n${err.stack}` : String(err)
    };
  }
}

const results: SmokeResult[] = [
  runSmoke('HorizontalRuleExtension', HorizontalRuleExtension),
  runSmoke('MarkdownImageExtension', MarkdownImageExtension),
  runSmoke('MarkdownLinkExtension', MarkdownLinkExtension)
];

// Combined smoke: all three together under a single root. Catches
// dependency-graph or name-collision issues that the individual
// tests miss. The Phase-0c extensions are excluded for the
// transitive-import reason documented at the top of this file.
const combinedResult = runSmoke(
  'all-three-combined',
  defineExtension({
    name: 'mosaic/smoke-root/combined',
    dependencies: [HorizontalRuleExtension, MarkdownImageExtension, MarkdownLinkExtension]
  })
);
results.push(combinedResult);

let failed = false;
for (const r of results) {
  if (r.ok) {
    console.log(`\u2713 ${r.name}`);
  } else {
    failed = true;

    console.error(`\u2717 ${r.name}\n${r.detail}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`\nAll ${results.length} extension smoke checks passed.`);
