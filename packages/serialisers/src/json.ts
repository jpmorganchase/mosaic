import fs from 'fs';

import type Serialiser from '@pull-docs/types/dist/Serialiser';

const Serialisers: Serialiser = {
  async serialise(fullPath, page) {
    return Buffer.from(JSON.stringify(page));
  },

  async deserialise(fullPath, data) {
    return JSON.parse(String(data));
  }
};

export default Serialisers;
