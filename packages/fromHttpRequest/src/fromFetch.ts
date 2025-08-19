/* eslint-disable eslint-comments/no-unlimited-disable */
import { fetch, Request } from 'undici';
import { fromFetch } from 'rxjs/fetch';

// eslint-disable-next-line
// @ts-ignore
globalThis.fetch = fetch;
// eslint-disable-next-line
// @ts-ignore
globalThis.Request = Request;

export { fromFetch };
/* eslint-enable eslint-comments/no-unlimited-disable */
