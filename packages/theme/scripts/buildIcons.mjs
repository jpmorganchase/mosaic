import esbuild from 'esbuild';
import glob from 'fast-glob';

import { saltIconNames } from './saltIconNames.mjs';

const packageName = process.env.npm_package_name;

try {
  await esbuild.build({
    entryPoints: glob.sync(['../../node_modules/@salt-ds/icons/dist-es/components/*.js']),
    bundle: false,
    outdir: 'dist',
    plugins: [saltIconNames]
  });
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
