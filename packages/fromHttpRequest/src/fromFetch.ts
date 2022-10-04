import * as nodeFetch from 'node-fetch';
import { fromFetch } from 'rxjs/fetch';

declare global {
  var fetch: typeof nodeFetch.default;
}
global.fetch = nodeFetch.default;

export { fromFetch };
