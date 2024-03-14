import { escapeRegExp } from 'lodash-es';
import path from 'node:path';

export function createPageTest(ignorePages: string[], pageExtensions: string[]) {
  const extTest = new RegExp(`${pageExtensions.map(ext => escapeRegExp(ext)).join('|')}$`);
  const ignoreTest = new RegExp(`${ignorePages.map(ignore => escapeRegExp(ignore)).join('|')}$`);
  return file =>
    !ignoreTest.test(file) && extTest.test(file) && !path.basename(file).startsWith('.');
}
