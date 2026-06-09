import { fetch, Request } from 'undici';
import { fromFetch } from 'rxjs/fetch';

// @ts-expect-error needed to make rxjs use undici's fetch
globalThis.fetch = fetch;
// @ts-expect-error needed to make rxjs use undici's Request
globalThis.Request = Request;

export { fromFetch };
