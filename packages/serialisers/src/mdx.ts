import type { Serialiser } from '@jpmorganchase/mosaic-types';
import { parseFrontmatter, stringifyFrontmatter } from './frontmatter.js';

const Serialisers: Serialiser = {
  async serialise(_fullPath, { content = '', ...meta }) {
    return Buffer.from(stringifyFrontmatter(content, meta));
  },

  async deserialise(_fullPath, rawData) {
    const { data, content } = parseFrontmatter(rawData);
    return {
      ...data,
      content
    } as any;
  }
};

export default Serialisers;
