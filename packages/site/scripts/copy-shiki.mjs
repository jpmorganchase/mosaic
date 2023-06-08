/**
 * NextJs output file tracing does not identify Shiki language and theme JSON files as required.
 *
 * This script copies the Shiki node_module into the NextJs standalone build output
 * so that the necessary files are present.
 *
 */
import fs from 'node:fs';
import path from 'path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const projectBase = process.cwd();
const standaloneDir = path.posix.join(projectBase, '.next', 'standalone', 'node_modules', 'shiki');
const shikiModuleDir = path.posix.resolve(path.posix.dirname(require.resolve('shiki')), '..');

try {
  console.group('Copying Shiki resources');
  console.log(`from: ${shikiModuleDir}`);
  console.log(`to: ${standaloneDir}`);
  console.groupEnd();
  await fs.promises.cp(shikiModuleDir, standaloneDir, { recursive: true });
} catch (err) {
  console.log('Error copying shiki resources');
  console.error(err);
}
