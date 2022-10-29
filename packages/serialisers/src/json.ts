import type { Serialiser } from '@jpmorganchase/mosaic-types';

const Serialisers: Serialiser = {
  async serialise(_fullPath, page) {
    return Buffer.from(JSON.stringify(page));
  },

  async deserialise(_fullPath, data) {
    return JSON.parse(String(data));
  }
};

export default Serialisers;
