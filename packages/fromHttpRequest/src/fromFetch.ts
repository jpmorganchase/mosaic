/* eslint-disable eslint-comments/no-unlimited-disable */
import * as nodeFetch from 'node-fetch';
import { fromFetch } from 'rxjs/fetch';

if (!globalThis.fetch) {
  // eslint-disable-next-line
  // @ts-ignore
  globalThis.fetch = nodeFetch.default;
  // eslint-disable-next-line
  // @ts-ignore
  globalThis.Request = nodeFetch.Request;
}

export { fromFetch };
/* eslint-enable eslint-comments/no-unlimited-disable */
