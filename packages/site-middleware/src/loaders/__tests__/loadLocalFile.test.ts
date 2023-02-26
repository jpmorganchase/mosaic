const mockFs = require('mock-fs');
import { loadLocalFile } from '../index.js';

describe('GIVEN loadLocalFile', () => {
  beforeEach(() => {
    mockFs({
      'some/snapshots/mynamespace/mydir': 'some-content'
    });
  });
  afterEach(() => {
    mockFs.restore();
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
      /ENOENT, no such file or directory 'some\/non-existent\/mynamespace\/mydir'/
    );
  });
});
