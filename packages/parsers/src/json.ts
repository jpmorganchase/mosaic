import fs from 'fs';

import type Parser from '@pull-docs/types/dist/Parser';

const Parsers: Parser = {
  async serialise(route, page) {
    return Buffer.from(JSON.stringify(page));
  },

  async deserialise(route, data) {
    return JSON.parse(String(data));
  },

  async deserialiseFromDisk(route, pagePath) {
    return Parsers.deserialise(route, await fs.promises.readFile(pagePath));
  }
};

export default Parsers;
