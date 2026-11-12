import type { Serialiser } from '@jpmorganchase/mosaic-types';
import { parseFrontmatter, stringifyFrontmatter } from './frontmatter.js';

// Markdown is not really a suitable format, as it doesn't allow for storing metadata - so this serialiser is more of an
// example than anything - it should ideally not be used
const Serialisers: Serialiser = {
  async serialise(_fullPath, { content = '' }) {
    return Buffer.from(stringifyFrontmatter(content, {}).replace(/^---[\s\S]+---/, ''));
  },

  async deserialise(fullPath, data) {
    const { content } = parseFrontmatter(`---\n---\n${data}`);
    const heading = content.match(/#{1,} (\w+$)/);
    return {
      content,
      title: heading ? heading[1] : fullPath,
      fullPath,
      route: fullPath
    };
  }
};

export default Serialisers;
