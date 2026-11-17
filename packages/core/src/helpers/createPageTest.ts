import path from 'node:path';

/** Literal suffix matching: an empty ignore list excludes no pages. */
export function createPageTest(ignorePages: string[], pageExtensions: string[]) {
  return (file: string) =>
    pageExtensions.some(extension => file.endsWith(extension)) &&
    !ignorePages.some(ignored => file.endsWith(ignored)) &&
    !path.basename(file).startsWith('.');
}
