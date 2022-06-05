import matter from 'gray-matter';
import fs from 'fs';

import type Parser from '@pull-docs/types/dist/Parser';

const Parsers: Parser = {
  async serialise(route, page) {
    return Buffer.from(matter.stringify(page.content, {}).replace(/^---[\s\S]+---/, ''));
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
  },

  async deserialiseFromDisk(route, pagePath) {
    return Parsers.deserialise(route, await fs.promises.readFile(pagePath));
  }
};

export default Parsers;
