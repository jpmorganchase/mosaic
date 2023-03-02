import fs from 'fs';

export const loadLocalFile = async (filePath: string): Promise<string> => {
  const realPath = await fs.promises.realpath(filePath);
  const data = await fs.promises.readFile(realPath, 'utf-8');
  return data.toString();
};
