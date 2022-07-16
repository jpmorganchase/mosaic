import fs from 'fs';

import type Serialiser from '@pull-docs/types/dist/Serialiser';

const Serialisers: Serialiser = {
  async serialise(route, page) {
    return Buffer.from(JSON.stringify(page));
  },

  async deserialise(route, data) {
    return JSON.parse(String(data));
  }
};

export default Serialisers;
