// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import type { Serialiser } from '@jpmorganchase/mosaic-types';

const createContent = async (data: string) => {
  const sourcePage = data.toString();
  return sourcePage;
};

const Serialisers: Serialiser = {
  async serialise(fullPath, { content = '' }) {
    return Buffer.from(content);
  },

  async deserialise(fullPath, data) {
    const content = await createContent(data);
    return { content, fullPath };
  }
};

export default Serialisers;
