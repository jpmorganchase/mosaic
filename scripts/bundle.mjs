import esbuild from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import glob from 'fast-glob';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import { vanillaExtractPlugin } from '@vanilla-extract/esbuild-plugin';

const args = process.argv.slice(2);
const watchEnabled = args[0] === 'watch';
const packageName = process.env.npm_package_name;

// Opt-in: when `BUNDLE_USE_CLIENT=1` is set in the package's `build:bundle`
// script, every emitted `.js` chunk gets a top-level `'use client'` directive.
//
// Background: React Server Components require the `'use client'` directive
// in the *built* file that a Server Component imports. esbuild strips
// top-level string directives during minification, so the directives we
// write in the source files don't survive into `dist/`. For Mosaic's UI
// packages (`components`, `site-components`, `content-editor-plugin`,
// `open-api-component`, `sitemap-component`, `layouts`) every export is
// effectively client-side — they wrap Salt DS, register React hooks, or
// read browser globals. Stamping the directive at bundle time is the
// canonical workaround (same pattern Material UI v6, Salt DS, and others
// adopted for App Router compatibility).
//
// Packages whose exports are genuinely server-safe (`store`, `theme`,
// `site-preset-styles`) intentionally do *not* opt in; they would
// otherwise force any importer into a client boundary unnecessarily.
const stampUseClient = process.env.BUNDLE_USE_CLIENT === '1';

/** esbuild plugin: prepends `'use client';\n` to every emitted JS chunk. */
const useClientDirectivePlugin = {
  name: 'use-client-directive',
  setup(build) {
    build.initialOptions.write = false; // we need to post-process before writing
    build.onEnd(async result => {
      if (!result.outputFiles) return;
      const writes = result.outputFiles.map(async file => {
        await fs.mkdir(path.dirname(file.path), { recursive: true });
        if (file.path.endsWith('.js')) {
          const prefixed = `'use client';\n${file.text}`;
          await fs.writeFile(file.path, prefixed);
        } else {
          await fs.writeFile(file.path, file.contents);
        }
      });
      await Promise.all(writes);
    });
  }
};

try {
  const context = await esbuild.context({
    entryPoints: glob.sync(['src/**/*.ts?(x)', 'src/*.ts?(x)'], {
      ignore: ['**/__tests__', 'src/labs']
    }),
    loader: {
      '.jpg': 'dataurl',
      '.png': 'dataurl',
      '.svg': 'text'
    },
    outdir: './dist',
    bundle: true,
    sourcemap: false,
    splitting: true,
    minify: true,
    format: 'esm',
    target: ['es2022'],
    plugins: [
      nodeExternalsPlugin({
        allowList: [/\.css$/]
      }),
      vanillaExtractPlugin({}),
      ...(stampUseClient ? [useClientDirectivePlugin] : []),
      {
        name: 'on-end',
        setup(build) {
          build.onEnd(({ errors = [] }) => {
            if (errors.length) {
              console.error(`build failed for ${packageName}:`, errors);
            } else {
              console.log(
                `build succeeded for ${packageName}${
                  stampUseClient ? ' (with use-client directive)' : ''
                }:`
              );
            }
          });
        }
      }
    ],
    external: [
      'react',
      'react-dom',
      'next/*',
      '@jpmorganchase/mosaic-components',
      '@jpmorganchase/mosaic-components-lab',
      '@jpmorganchase/mosaic-open-api-component',
      '@jpmorganchase/mosaic-content-editor-plugin',
      '@jpmorganchase/mosaic-site-components',
      '@jpmorganchase/mosaic-layouts',
      '@jpmorganchase/mosaic-store'
    ]
  });
  if (watchEnabled) {
    await context.watch();
  } else {
    await context.rebuild();
    await context.dispose();
  }
} catch (e) {
  if (e.errors && e.errors.length > 0) {
    console.group(`!!!!!!! ${packageName} build errors !!!!!!!`);
    console.error(e.errors);
    console.groupEnd();
  }

  if (e.warnings && e.warnings.length > 0) {
    console.group(`!!!!!!! ${packageName} build warnings !!!!!!!`);
    console.error(e.warnings);
    console.groupEnd();
  }
  process.exit(1);
}
