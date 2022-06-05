import matter from 'gray-matter';
import fs from 'fs';
import type { TDataOut } from 'memfs/lib/encoding';
import omit from 'lodash/omit';
import type Parser from '@pull-docs/types/dist/Parser';

const Parsers: Parser = {
  async serialise(route, page) {
    return Buffer.from(matter.stringify(page.content, omit(page, 'content')));
  },

  async deserialise(route, data: TDataOut) {
    const { data: meta, content } = matter(data) as any;
    return {
      content,
      ...meta
    };
  },

  async deserialiseFromDisk(route, pagePath) {
    return Parsers.deserialise(route, await fs.promises.readFile(pagePath));
  }
};

export default Parsers;
