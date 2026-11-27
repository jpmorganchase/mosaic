import { createHash } from 'node:crypto';

export function checkSaveSource(rawPage: Buffer, expectedSourceHash?: string): string | undefined {
  if (
    expectedSourceHash !== undefined &&
    createHash('sha256').update(rawPage).digest('hex') !== expectedSourceHash
  ) {
    return 'This page changed after you opened it. Copy your edits before reopening the page. If the newer version is still unavailable, wait for the content source to refresh.';
  }
  return undefined;
}
