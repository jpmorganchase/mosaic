import fs from 'fs';
import path from 'path';

export const loadLocalFile = async (filePath: string): Promise<string> => {
  let localPath = filePath;
  if ((await fs.promises.stat(filePath)).isDirectory()) {
    localPath = path.posix.join(localPath, 'index');
  }
  const realPath = await fs.promises.realpath(localPath);
  const data = await fs.promises.readFile(realPath, 'utf-8');
  return data.toString();
};
