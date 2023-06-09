/**
 * NextJs output file tracing does not identify Shiki language and theme JSON files as required.
 *
 * This script copies the Shiki node_module into the NextJs public dir
 * so that the necessary files are present.
 *
 */
import fs from 'node:fs';
import path from 'path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const projectBase = process.cwd();
const publicShikiDir = path.posix.join(projectBase, 'public', 'shiki');
const shikiModuleDir = path.posix.resolve(path.posix.dirname(require.resolve('shiki')), '..');

try {
  console.group('Copying Shiki resources');
  if (fs.existsSync(publicShikiDir)) {
    console.log('Skipping Shiki copy...');
    console.log(`Shiki already copied to: ${publicShikiDir}`);
    console.groupEnd();
    process.exit(0);
  }
  console.log(`from: ${shikiModuleDir}`);
  console.log(`to: ${publicShikiDir}`);
  console.groupEnd();

  await fs.promises.cp(
    path.posix.join(shikiModuleDir, 'themes', 'light-plus.json'),
    path.posix.join(publicShikiDir, 'themes', 'light-plus.json')
  );
  await fs.promises.cp(
    path.posix.join(shikiModuleDir, 'themes', 'dark-plus.json'),
    path.posix.join(publicShikiDir, 'themes', 'dark-plus.json')
  );
  await fs.promises.cp(
    path.posix.join(shikiModuleDir, 'languages'),
    path.posix.join(publicShikiDir, 'languages'),
    {
      recursive: true
    }
  );
} catch (err) {
  console.log('Error copying shiki resources');
  console.error(err);
}
