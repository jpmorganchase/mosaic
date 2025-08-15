import { Request } from 'undici';

// Polyfill for undici Request in globalThis for testing purposes
// This is necessary because some libraries expect the Request object to be available globally e.g. msw.
// @ts-ignore
globalThis.Request = Request;
