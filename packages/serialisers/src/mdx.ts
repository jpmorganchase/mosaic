import matter from 'gray-matter';
import type { TDataOut } from 'memfs/lib/encoding';
import type Serialiser from '@pull-docs/types/dist/Serialiser';

const Serialisers: Serialiser = {
  async serialise(_fullPath, { content = '', ...meta }) {
    return Buffer.from(matter.stringify(content, meta));
  },

  async deserialise(_fullPath, rawData: TDataOut) {
    const { data, content } = matter(rawData) as any;
    return {
      ...data,
      content
    };
  }
};

export default Serialisers;
