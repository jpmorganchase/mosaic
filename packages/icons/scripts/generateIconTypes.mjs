import esbuild from 'esbuild';
import { globSync } from 'tinyglobby';

import { saltIconNames } from './saltIconNames.mjs';

const packageName = process.env.npm_package_name;

try {
  await esbuild.build({
    entryPoints: globSync(['../../node_modules/@salt-ds/icons/dist-es/components/*.js'], {
      expandDirectories: false
    }),
    bundle: false,
    outdir: '.tmp',
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
