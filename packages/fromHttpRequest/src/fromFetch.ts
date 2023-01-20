/* eslint-disable eslint-comments/no-unlimited-disable */
import * as nodeFetch from 'node-fetch';
import { fromFetch } from 'rxjs/fetch';

declare global {
  // eslint-disable-next-line
  // @ts-ignore
  var fetch: typeof nodeFetch.default;
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.fetch = nodeFetch.default;

export { fromFetch };
/* eslint-enable eslint-comments/no-unlimited-disable */
