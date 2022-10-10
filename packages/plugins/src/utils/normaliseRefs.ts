import path from 'path';

import glob from 'fast-glob';
import set from 'lodash/set';

function createFileGlob(url, pageExtensions) {
  if (pageExtensions.length === 1) {
    return `${url}${pageExtensions[0]}`;
  }
  return `${url}{${pageExtensions.join(',')}}`;
}

export default async function normaliseRefs(filepath, refs, filesystem, pageExtensions, ignorePages) {
  const configWithoutGlobs = {};

  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i];
    const [url, fragment = ''] = ref.$$value.split('#');

    if (!url) {
      continue;
    }

    const fullUrl = path.resolve(path.dirname(filepath), url);

    if (!glob.isDynamicPattern(url)) {
      if (!(await filesystem.promises.exists(fullUrl))) {
        throw new Error(
          `A \`$ref\` for '${filepath}' pointed to page '${fullUrl}' - which could not be found.`
        );
      }
      const refRealPath = await filesystem.promises.realpath(
        fullUrl
        //path.resolve(path.dirname(filepath), url)
      );
      const stat = await filesystem.promises.stat(refRealPath);
      // Turn directory refs into full index paths
      // TODO: But DO we want to do this?
      if (stat.isDirectory()) {
        // && !/\/index(\.\w{1,4})?$/.test(url)) {
        set(configWithoutGlobs, ref.$$path.slice(0, -1), {
          $ref: `${await filesystem.promises.realpath(path.join(refRealPath, 'index'))}#${fragment}`
        });
      } else {
        set(configWithoutGlobs, ref.$$path.slice(0, -1), {
          $ref: `${refRealPath}#${fragment}`
        });
      }
      continue;
    }

    try {
      let globResolvedRefs =
        // If the pattern doesn't have an explicit file extension - then we'll make it just return pages
        await filesystem.promises.glob(
          !/\/[^/]+\.\w{2,4}$/.test(url) ? createFileGlob(url, pageExtensions) : url,
          {
            ignore: [filepath, ...ignorePages.map(ignore => `**/${ignore}`)],
            cwd: path.dirname(filepath),
            absolute: true
          }
        );

      // Use a set so we de-dupe any symlinks that point to the same page
      const resolvedRefs = new Set();

      for (const value of globResolvedRefs) {
        const refRealPath = await filesystem.promises.realpath(path.resolve(filepath, value));
        if (refRealPath !== (await filesystem.promises.realpath(filepath))) {
          resolvedRefs.add(`${refRealPath}#${fragment}`);
        }
      }

      set(
        configWithoutGlobs,
        ref.$$path.slice(0, -1),
        Array.from(resolvedRefs).map($ref => ({ $ref }))
      );
    } catch (e) {
      throw e;
    }
  }

  return configWithoutGlobs;
}
