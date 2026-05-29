import type { Serialiser } from '@jpmorganchase/mosaic-types';

const Serialisers: Serialiser = {
  async serialise(_fullPath, page) {
    return Buffer.from(JSON.stringify(page));
  },

  async deserialise(fullPath, data) {
    // Tolerate empty/whitespace payloads — return `{}` rather than
    // throwing the bare `Unexpected end of JSON input` which is hard to
    // trace when it surfaces several stack frames up during page
    // render. Genuine parse errors are re-thrown with the path
    // attached so the caller can act on them.
    const text = data == null ? '' : String(data).trim();
    if (text === '') return {} as never;
    try {
      return JSON.parse(text);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid JSON at ${fullPath}: ${message}`);
    }
  }
};

export default Serialisers;
