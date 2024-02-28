import deepmerge, { type ArrayMergeOptions, type Options } from 'deepmerge';

const overwriteMerge = (
  _destinationArray: unknown[],
  sourceArray: unknown[],
  _options: ArrayMergeOptions
) => sourceArray;

/**
 * deeply merges the `updatedPageMetadata` into the `originalPageMetadata`.
 *
 * By default, array values in `updatedPageMetadata` *overwrite*  `originalPageMetadata` array values completely rather than concatenating them.
 *
 * To override this behavior use the `options` parameter as mentioned here:
 * https://www.npmjs.com/package/deepmerge
 *
 * @param originalPageMetadata
 * @param updatedPageMetadata
 * @param options
 * @returns
 */
function mergePageContent<T, U>(
  originalPageMetadata: Partial<T>,
  updatedPageMetadata: U,
  options?: Options
) {
  return deepmerge<T, U>(originalPageMetadata, updatedPageMetadata, {
    arrayMerge: overwriteMerge,
    ...options
  });
}

export { mergePageContent };
