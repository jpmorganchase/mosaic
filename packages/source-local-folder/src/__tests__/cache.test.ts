import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test, vi } from 'vitest';
import LocalFolderSource from '../index.js';

test('refreshes a same-size file after a write that preserves its modification time', async () => {
  const rootDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mosaic-preserved-mtime-'));
  const file = path.join(rootDir, 'page.mdx');
  const timestamp = new Date('2024-01-01T00:00:00.000Z');
  const pageContents: string[] = [];
  const errors: unknown[] = [];
  fs.writeFileSync(file, 'first');
  fs.utimesSync(file, timestamp, timestamp);
  const initial = await fs.promises.stat(file);
  const sub = LocalFolderSource.create({ rootDir, extensions: ['.mdx'] }, {
    serialiser: {
      deserialise: async (fullPath: string, data: Buffer) => ({ fullPath, content: String(data) })
    }
  } as never).subscribe({
    next: pages => pageContents.push(String(pages[0]?.content)),
    error: error => errors.push(error)
  });
  try {
    await vi.waitFor(() => expect(pageContents).toEqual(['first']));
    fs.writeFileSync(file, 'fresh');
    fs.utimesSync(file, timestamp, timestamp);
    const updated = await fs.promises.stat(file);
    expect(updated.mtimeMs).toBe(initial.mtimeMs);
    expect(updated.size).toBe(initial.size);
    await vi.waitFor(() => expect(pageContents).toContain('fresh'));
    expect(errors).toEqual([]);
  } finally {
    sub.unsubscribe();
    await fs.promises.rm(rootDir, { recursive: true, force: true });
  }
});
