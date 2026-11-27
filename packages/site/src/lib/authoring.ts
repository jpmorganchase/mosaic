/**
 * The authoring site: where this site's pages are edited, when it isn't
 * this one (`MOSAIC_AUTHORING_URL`).
 *
 * Each environment raises an editor's pull request against the branch it
 * reads, so editing on test would skip dev. Set `MOSAIC_AUTHORING_URL` on
 * every environment except the one authors use. This site then sends edit
 * and create requests to the authoring site, and refuses to preview or
 * save. The browser side is `AuthoringSiteProvider` from
 * `@jpmorganchase/mosaic-content-editor-plugin/authoringSite`.
 */
import { getSiteConfig } from './config';

/** `MOSAIC_AUTHORING_URL` without a trailing slash, or `undefined` when pages are edited here. */
export const AUTHORING_URL = getSiteConfig().authoringUrl;

/** Why this site refuses to edit, for the editor's error messages. */
export const EDITED_ELSEWHERE_ERROR = AUTHORING_URL
  ? `This site's pages are edited on ${AUTHORING_URL}.`
  : '';

/**
 * The URL of `pathname` with `searchParams` on the authoring site.
 * Only call it when `AUTHORING_URL` is set.
 */
export function authoringHref(
  pathname: string,
  searchParams: Record<string, string | string[] | undefined> = {}
): string {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(searchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      query.append(name, item);
    }
  }
  const search = query.toString();
  return `${AUTHORING_URL}${pathname}${search ? `?${search}` : ''}`;
}
