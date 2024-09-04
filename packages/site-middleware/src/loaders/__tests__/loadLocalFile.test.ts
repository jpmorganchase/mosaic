import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest';
import { vol, fs } from 'memfs';
import { loadLocalFile } from '../index.js';

vi.mock('fs', () => ({
  default: fs
}));

describe('GIVEN loadLocalFile', () => {
  beforeEach(() => {
    vol.fromNestedJSON({
      'some/snapshots/mynamespace/mydir': 'some-content',
      'some/snapshots/mynamespace/dir/index': 'directory index content'
    });
  });
  afterEach(() => {
    vol.reset();
  });

  test('THEN it can read from a local file', async () => {
    // arrange
    const content = await loadLocalFile('some/snapshots/mynamespace/mydir');
    // assert
    expect(content).toEqual('some-content');
  });
  test('THEN it throws and error when the local file does not exist', async () => {
    // assert
    await expect(loadLocalFile('some/non-existent/mynamespace/mydir')).rejects.toThrow(
      /ENOENT: no such file or directory, stat 'some\/non-existent\/mynamespace\/mydir'/
    );
  });
  test('THEN it loads the index file if a directory is requested', async () => {
    // arrange
    const content = await loadLocalFile('some/snapshots/mynamespace/dir');
    // assert
    expect(content).toEqual('directory index content');
  });
});
