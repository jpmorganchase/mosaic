import matter from 'gray-matter';
import fs from 'fs';
import type { TDataOut } from 'memfs/lib/encoding';
import omit from 'lodash/omit';
import type Serialiser from '@pull-docs/types/dist/Serialiser';

const Serialisers: Serialiser = {
  async serialise(route, page) {
    return Buffer.from(matter.stringify(page.content || '', omit(page, 'content')));
  },

  async deserialise(route, rawData: TDataOut) {
    const { data, content } = matter(rawData) as any;
    return {
      content,
      ...data
    };
  }
};

export default Serialisers;
