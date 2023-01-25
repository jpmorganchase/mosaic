import path from 'path';
import fs from 'fs';

import glob from 'fast-glob';
import minimatch from 'minimatch';
import type { SourceDefinition, CommonSourceOptions } from '@jpmorganchase/mosaic-types';

import GitClone from './lib/git-clone/index';
import createModulesIndex from './createModulesIndex';
import createContent from './createContent';
import createIndex from './createIndex';
import createRootIndex from './createRootIndex';
import type Repo from './lib/git-clone';

export type Options = CommonSourceOptions & {
  targetFolders: string[];
  subfolder?: string;
  checkIntervalMins?: number;
  repoBranch: string;
  repoUrl: string;
};

/**
 * A source definition for syncing with Bitbucket repositories.
 */
export default async function init(options: Options): Promise<SourceDefinition> {
  if (
    !process.env.BITBUCKET_CLONE_CREDENTIALS ||
    process.env.BITBUCKET_CLONE_CREDENTIALS.indexOf(':') === -1
  ) {
    throw new Error(
      'No valid credentials found in `BITBUCKET_CLONE_CREDENTIALS`. Ensure a valid *non-URL-encoded* env var is setup with the format: "SID:PersonalKey"'
    );
  }
  if (!options.repoBranch || !options.repoUrl) {
    throw new Error('Missing options for Source');
  }
  return await syncRepoSource(options);
}

export async function cloneRepo(endpoint, branch, credentials): Promise<Repo> {
  const cloneDocs = new GitClone({
    branch,
    repo: endpoint,
    credentials
  });
  await cloneDocs.init();

  return cloneDocs;
}

function createRootIndexDescriptors(contentRoot, options, repositoryAPI): SourceDefinition {
  return getRootIndexRoute(contentRoot).map(async pagePath => {
    const contentRootReplace = contentRoot.replace(/\\/g, '/');
    const pagePathMatcher = new RegExp(`${contentRootReplace}/(.+?)/.*$`);
    const pagePageMatches = pagePath.match(pagePathMatcher);
    const version = pagePageMatches?.[1];

    let route = pagePath.replace(/\.html$/, '.mdx');
    route = `/${path.relative(contentRoot, route).replace(/\\/g, '/')}`;
    const fullRoute = `/${options.namespace}${route}`;
    const tagInfo = await repositoryAPI.getTagInfo(options.repoBranch);
    const additionalMetadata = {
      releaseDate: tagInfo.date,
      description: tagInfo.description,
      repoBranch: options.repoBranch
    };
    const versionedContentRoot = path.join(contentRoot, version);
    const descriptor = await createRootIndex(
      versionedContentRoot,
      pagePath,
      fullRoute,
      additionalMetadata
    );
    return descriptor
      ? {
          ...descriptor,
          route
        }
      : null;
  });
}

function createModuleIndexDescriptors(contentRoot, options) {
  return getAllModuleIndexRoutes(contentRoot).map(async pagePath => {
    const contentRootReplace = contentRoot.replace(/\\/g, '/');
    const modulesIndexMatcher = new RegExp(`${contentRootReplace}/(.+?)/modules.html$`);
    const moduleIndexMatches = pagePath.match(modulesIndexMatcher);
    const version = moduleIndexMatches[1];

    const modulesNewPath = path.join(contentRoot, version, 'modules');
    if (!fs.existsSync(modulesNewPath)) {
      fs.mkdirSync(modulesNewPath);
    }
    const modulesNewIndex = path.join(contentRoot, version, 'modules', 'index.mdx');
    fs.renameSync(pagePath, modulesNewIndex);

    const route = `/${path
      .relative(contentRoot, path.join(contentRoot, version, 'modules', 'index.mdx'))
      .replace(/\\/g, '/')}`;
    const fullRoute = `/${options.namespace}${route}`;
    const versionedContentRoot = path.join(contentRoot, version);
    const descriptor = await createModulesIndex(versionedContentRoot, modulesNewIndex, fullRoute);
    return descriptor
      ? {
          ...descriptor,
          route
        }
      : null;
  });
}

function createPageDescriptors(contentRoot, options, repositoryAPI) {
  const docsPattern = getDocsGlob(options.targetFolders);
  return getAllPageRoutes(contentRoot, docsPattern).map(async pagePath => {
    const contentRootReplace = contentRoot.replace(/\\/g, '/');
    const pagePathMatcher = new RegExp(`${contentRootReplace}/(.+?)/(.*)$`);
    const pagePageMatches = pagePath.match(pagePathMatcher);
    const version = pagePageMatches?.[1];
    const rootIndex = pagePageMatches?.[2];

    let route = pagePath.replace('.html', '.mdx');
    route = `/${path.relative(contentRoot, route).replace(/\\/g, '/')}`;
    const fullRoute = `/${options.namespace}${route}`;
    const versionedContentRoot = path.join(contentRoot, version);
    const className = 'typedoc-api-page';
    const descriptor = await createContent(versionedContentRoot, pagePath, fullRoute, className);
    if (descriptor) {
      descriptor.route = route;
      descriptor.meta.title = path.basename(pagePath, '.html');
      if (rootIndex === 'index.html') {
        descriptor.meta.title = version;
        descriptor.meta.sidebar = {};
        descriptor.meta.sidebar.label = version;
        descriptor.meta.data.version = version;
        const { date: releaseDate, description } = await repositoryAPI.getTagInfo(
          options.repoBranch
        );
        descriptor.meta.data.description = description;
        descriptor.meta.data.releaseDate = releaseDate;
      }
    }
    return descriptor;
  });
}

function createIndexDescriptors(contentRoot) {
  return getAllIndexPageRoutes(contentRoot).map(indexPath => {
    let route = indexPath.replace('.html', '.mdx');
    route = `/${path.relative(contentRoot, route).replace(/\\/g, '/')}`;
    const descriptor = createIndex(indexPath, route);
    return descriptor
      ? {
          ...descriptor,
          route
        }
      : null;
  });
}

async function syncRepoSource(options: Options) {
  const { repositoryAPI } = await cloneAndSyncRepo(
    options,
    process.env.BITBUCKET_CLONE_CREDENTIALS
  );

  return {
    namespace: options.namespace,
    name: repositoryAPI.name,
    getLastModifiedDate: repositoryAPI.getLatestCommitDate.bind(repositoryAPI),
    // Returns: Unsubscribe callback
    watch: (callback, errCallback) => watchRepo(options, repositoryAPI, callback, errCallback)
  };
}

async function watchRepo(options, repositoryAPI, callback, errCallback) {
  const docsPattern = getDocsGlob(options.targetFolders);

  const { checkIntervalMins = 10, subfolder: clonedDocsSubfolder } = options;
  const contentRoot = path.join(repositoryAPI.dir, clonedDocsSubfolder);
  let unsubscribe;

  const getPageDescriptors = () =>
    Promise.all([
      ...createRootIndexDescriptors(contentRoot, options, repositoryAPI),
      ...createModuleIndexDescriptors(contentRoot, options),
      ...createIndexDescriptors(contentRoot),
      ...createPageDescriptors(contentRoot, options, repositoryAPI)
    ]);

  try {
    // Call returned `unsubscribe` fn to stop listening for changes
    unsubscribe = await repositoryAPI.onCommitChange(
      async gitUpdates => {
        const filteredUpdates = filterPathsByPatterns(gitUpdates, repositoryAPI.dir, docsPattern);
        if (!filteredUpdates.length) {
          return;
        }
        callback(await getPageDescriptors());
      },
      errCallback,
      false,
      checkIntervalMins * 60000
    );
    callback(await getPageDescriptors());

    return () => {
      unsubscribe();
    };
  } catch (e) {
    errCallback(e);
    console.error(e);

    if (unsubscribe) {
      unsubscribe();
    }
  }
}

async function cloneAndSyncRepo(options, repoCredentials) {
  const { repoBranch, repoUrl, subfolder: clonedDocsSubfolder = '' } = options;
  const repositoryAPI = await cloneRepo(repoUrl, repoBranch, repoCredentials);
  const contentRoot = path.join(repositoryAPI.dir, clonedDocsSubfolder);

  try {
    await fs.promises.stat(contentRoot);
  } catch (e) {
    console.error(
      `======== Could not find folder '${clonedDocsSubfolder}' in repository ${repoUrl} (branch '${repoBranch}'). Check the 'subfolder' field in the CMS ========`
    );
    process.exit(1);
  }

  return {
    contentRoot,
    repositoryAPI,
    name: repositoryAPI.name,
    getLastModifiedDate: repositoryAPI.getLatestCommitDate.bind(repositoryAPI)
  };
}

function filterPathsByPatterns(files, basePath, docsPattern) {
  return files.filter(file => {
    // Use a pathname relative to cloned repo root, like we do in getAllPageRoutes
    const relativeFilePath = path.relative(basePath, String(file)).replace(/\\/g, '/');
    // Ensure the updated files meet the same pattern matching requirements as getAllPageRoutes's glob.sync
    return minimatch(relativeFilePath, docsPattern);
  });
}

function getRootIndexRoute(contentRoot) {
  const globbedFiles = glob.sync('*/index.html', {
    absolute: true,
    cwd: contentRoot
  });
  return globbedFiles;
}

function getAllIndexPageRoutes(contentRoot) {
  // Typedocs does not generate an index.html for each sub-directory.
  // To align with our site's expectations which says 'each directory should have an index.html'
  // we create one for the possible Typedoc subdirectories

  // The top level directory of content should contain Typedocs directory structure
  // <contentRoot>/<version>/modules
  // <contentRoot>/<version>/interfaces
  // <contentRoot>/<version>/enums
  // <contentRoot>/<version>/classes
  // Typedocs does create an index page for modules, so we rename this via `renameModulesIndex`
  // For the rest we create a simple index page by globbing the content and building a page of links
  const entries = fs.readdirSync(contentRoot, { withFileTypes: true });
  const folders = entries.filter(folder => folder.isDirectory());

  const indexPageRoutes = folders.reduce((indexPageResult, versionFolder) => {
    const docTypeResult = ['interfaces', 'enums', 'classes'].reduce((result, docType) => {
      const docTypeSubdir = path.join(contentRoot, versionFolder.name, docType);
      if (fs.existsSync(docTypeSubdir)) {
        indexPageResult;
        const docTypeIndex = path.join(docTypeSubdir, 'index.html');
        result.push(docTypeIndex);
      }
      return result;
    }, []);
    return [...indexPageResult, ...docTypeResult];
  }, []);
  return indexPageRoutes;
}

function getAllModuleIndexRoutes(contentRoot) {
  const globbedFiles = glob.sync('*/modules.html', {
    absolute: true,
    cwd: contentRoot
  });
  return globbedFiles;
}

function getDocsGlob(targetFolderNames) {
  if (!targetFolderNames) {
    return '**/*.html';
  }
  const namespaceRootGlob = targetFolderNames
    ? `?(${targetFolderNames.map(glob.escapePath).join('|')})`
    : '';
  return `**/${namespaceRootGlob}/**/*.html`;
}

function getAllPageRoutes(contentRoot, docsPattern) {
  const globbedFiles = glob.sync(docsPattern, {
    absolute: true,
    cwd: contentRoot
  });
  // Remove any contentRoot index.html/modules.html files as these are handled separately
  return globbedFiles.filter(pageFile => {
    const contentRootReplace = contentRoot.replace(/\\/g, '/');
    const rootIndexMatcher = new RegExp(`${contentRootReplace}/(.+?)/index.html$`);
    const modulesIndexMatcher = new RegExp(`${contentRootReplace}/(.+?)/modules.html$`);
    return !(pageFile.match(rootIndexMatcher) && pageFile.match(modulesIndexMatcher));
  });
  return globbedFiles;
}
