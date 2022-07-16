import matter from 'gray-matter';

import type Serialiser from '@pull-docs/types/dist/Serialiser';

// Markdown is not really a suitable format, as it doesn't allow for storing metadata - so this serialiser is more of an
// example than anything - it should ideally not be used
const Serialisers: Serialiser = {
  async serialise(route, { content = '' }) {
    return Buffer.from(matter.stringify(content, {}).replace(/^---[\s\S]+---/, ''));
  },

  async deserialise(route, data) {
    const { content } = matter(`---\n---\n${data}`) as any;
    const heading = content.match(/#{1,} (\w+$)/);
    return {
      content,
      title: heading ? heading[1] : route,
      route,
      friendlyRoute: route
    };
  }
};

export default Serialisers;
