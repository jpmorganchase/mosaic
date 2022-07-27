import cp from 'child_process';
import path from 'path';

import fs from 'fs-extra';

const gitChangeType = {
  A: 'add',
  D: 'delete',
  M: 'modify',
  R: 'rename'
};

function getCloneDirName(repo) {
  const [, projectNameAndRepoName] = path.normalize(repo).match(/([^/]+\/[^/]+)\.git$/);

  return path.join(process.cwd(), '.tmp/.cloned_docs', projectNameAndRepoName);
}

// Returns a function that when called, will defer for {timeout}ms and collect the args of every
// call made to it within that time. It will then invoke {promiseFn} with those args spread.
// If {maxStringSize} is reached before the {timeout} expires, the function will be called immediately.
// NOTE: 8191 is the CLI command max string size on windows, so we will deduct 191 from that to cater for the 'git log ...'
// starting section of the command
function batchPromiseCallback<T>(
  wrappedFn,
  maxStringSize = 8000,
  timeout = 0
): (arg: any) => Promise<T> {
  let intervalId;
  let totalLength = 0;

  let batchedArgs = [];
  let resolvers = [];

  function invokeFn() {
    const currentResolvers = resolvers.slice();
    intervalId = 0;
    wrappedFn(...batchedArgs)
      .then(results => currentResolvers.forEach((resolve, i) => resolve(results[i])))
      .catch(e => console.error(e));
    totalLength = 0;
    batchedArgs = [];
    resolvers = [];
  }

  return function runner(arg) {
    totalLength += arg.length;
    if (!intervalId) {
      intervalId = setTimeout(invokeFn, timeout);
    }
    const resultPromise = new Promise<T>(resolve => resolvers.push(resolve));
    // If command will exceed maximum CLI size, don't add it to the batchedArgs but instead call wrapped fn immediately and flush args
    // then re-run this command after the flush
    if (totalLength > maxStringSize) {
      clearInterval(intervalId);
      invokeFn();
      return runner(arg);
    } else {
      batchedArgs.push(arg);
    }
    return resultPromise;
  };
}

function spawn(exe, args, cwd): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const child = cp.spawn(exe, args, { cwd });

    const buffer: string[] = [];

    function handleExit(code) {
      if (code) {
        reject(new Error(`Command '${exe} ${args.join(' ')}' failed: ${code}. ${buffer.join('')}`));
      } else {
        resolve(buffer.join(''));
      }
    }

    const concatBuffer = chunk => buffer.push(chunk.toString());
    child.stdout.on('data', concatBuffer);
    child.stderr.on('data', concatBuffer);
    child.on('error', concatBuffer);
    child.once('close', handleExit);
    child.once('exit', handleExit);
  }).catch(e => {
    e.message = stripCredentials(e.message);
    throw e;
  });
}

async function* updatedFilesGenerator(repositoryAPI, disableAutoPullChanges = false) {
  let lastSyncedRevision = await repositoryAPI.currentLocalRevision();

  while (true) {
    await repositoryAPI.fetch();
    const latestRevision = await repositoryAPI.latestRemoteRevision();

    if (latestRevision !== lastSyncedRevision) {
      if (!disableAutoPullChanges) {
        await repositoryAPI.reset();
        const changes = await repositoryAPI.diff(lastSyncedRevision);
        if (changes.length) {
          yield changes;
          lastSyncedRevision = latestRevision;
          continue;
        }
      } else {
        yield [];
        lastSyncedRevision = latestRevision;
        continue;
      }
    }
    lastSyncedRevision = latestRevision;
    yield null;
  }
}

async function doesPreviousCloneExist(repo, dir) {
  try {
    if (!(await fs.promises.stat(path.join(dir, '.git')))) {
      return false;
    }
    // Output will look something like:
    // origin	ssh://git@bitbucketdc-ssh.jpmchase.net:7999/x/x.git (fetch)
    const [, projectURI] = (await spawn('git', ['remote', '-v'], dir)).match(/\s+([^ ]+)/);
    return projectURI === repo;
  } catch (e) {
    return false;
  }
}

function stripCredentials(url) {
  return url.replace(/(\b(ssh|https?):\/\/[^:]+?:)([^@]+)@/i, (_, $1) => `${$1}*@`);
}

export default class Repo {
  #cloned = false;
  #dir = '';
  #cloneRootDir = '';
  #remote = '';
  #name = '';
  #branch = '';
  #repo = '';

  constructor({ credentials, remote = 'origin', branch, repo }) {
    if (!repo) {
      throw new Error('Missing required options `repo`.');
    }
    if (!credentials) {
      console.warn('[PullDocs] No `credentials` provided for bitbucket request.');
    }
    this.#cloneRootDir = getCloneDirName(repo);
    this.#dir = path.join(this.#cloneRootDir, '.pull-docs-worktrees', branch);
    this.#remote = remote;
    this.#branch = branch;
    this.#repo = credentials
      ? `https://${credentials
          .split(':')
          .map(credential => encodeURIComponent(credential))
          .join(':')}@${repo}`
      : repo;
    // Hide credentials when displaying repository name
    this.#name = `${stripCredentials(this.#repo)}#${branch}`;
  }

  get name() {
    return this.#name;
  }

  get dir() {
    return this.#dir;
  }

  onCommitChange(
    callback,
    errCallback,
    disableAutoPullChanges = false,
    updateInterval = 15 * 60 * 1000
  ) {
    const updatedFilesGen = updatedFilesGenerator(this, disableAutoPullChanges);

    let intervalId = setInterval(async () => {
      try {
        const { value: updatedFiles } = await updatedFilesGen.next();

        if (updatedFiles && (disableAutoPullChanges || updatedFiles.length)) {
          callback(updatedFiles);
        }
      } catch (e) {
        console.warn(`[PullDocs] Unsubscribing from \`onCommitChange\` for ${this.name}`);
        unsubscribe();
        errCallback(e);
      }
    }, updateInterval);

    const unsubscribe = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    return unsubscribe;
  }

  async pull() {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    return await spawn('git', ['pull', this.#remote, this.#branch], this.#dir);
  }

  async diff(latestRevision) {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    const diff = await spawn(
      'git',
      ['diff', `${latestRevision}..${this.#branch}`, '--name-status', '--no-renames'],
      this.#dir
    );

    if (!diff) {
      return [];
    }

    return diff
      .trim()
      .split('\n')
      .map(line => {
        const [typeCode, filePath] = line.split('\t');
        return {
          toString() {
            return this.file;
          },
          type: gitChangeType[typeCode] || 'Unknown',
          typeCode,
          file: path.join(this.#dir, filePath)
        };
      });
  }

  reset() {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    return spawn('git', ['reset', `${this.#branch}`, '--hard'], this.#dir);
  }

  async hasLatestChanges() {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    await this.fetch();
    return (await this.latestRemoteRevision()) === (await this.currentLocalRevision());
  }

  async currentLocalRevision() {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    const result = await spawn('git', ['rev-parse', 'HEAD'], this.#dir);
    if (!result) {
      console.warn('[PullDocs] No revision found for HEAD');
      return '';
    }
    return result ? result.trim() : '';
  }

  async latestRemoteRevision() {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    const result = await spawn('git', ['rev-parse', `${this.#branch}`], this.#dir);

    if (!result) {
      console.warn(`[PullDocs] No revision found for tag ${this.#branch}`);
      return null;
    }
    return result.trim();
  }

  // batchPromiseCallback<Date>(
  getLatestCommitDate = async (page): Promise<number> => {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    const result = await spawn(
      'git',
      ['log', '-1', '--format="%ci"', '--date=iso', '--', `${page}`],
      this.#dir
    );

    if (!result) {
      throw new Error(`No date found for '${page}'`);
    }
    return Date.parse(result.trimEnd().replace(/"/g, '')) || new Date().getTime();
  };

  fetch() {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    return spawn('git', ['fetch', '--all'], this.#dir);
  }

  async init() {
    try {
      this.#cloned = true;

      if (!(await doesPreviousCloneExist(this.#repo, this.#cloneRootDir))) {
        console.debug(`[PullDocs] Creating main worktree for repo '${this.#name}'`);
        await fs.emptyDir(this.#cloneRootDir);
        await spawn(
          'git',
          ['clone', this.#repo, '--no-checkout', `--origin=${this.#remote}`],
          // Go up 1 dir, so the clone creates the main worktree folder
          path.dirname(this.#cloneRootDir)
        );
      } else {
        console.debug(`[PullDocs] Re-using main worktree for repo '${this.#name}'`);
      }
      if (!(await doesPreviousCloneExist(this.#repo, this.#dir))) {
        console.debug(`[PullDocs] Creating linked worktree repo '${this.#name} branch '${this.#branch}'`);
        await spawn(
          'git',
          ['worktree', 'add', '-f', this.#dir, this.#branch],
          this.#cloneRootDir
        );
      } else {
        console.debug(`[PullDocs] Re-using linked worktree repo '${this.#name} branch '${this.#branch}'`);
        await this.pull();
      }
    } catch (e) {
      this.#cloned = false;
      throw e;
    }
  }

  getTagInfo = async tag => {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    const result = await spawn('git', ['show', '-s', '--format="%ci|%B"', tag], this.#dir);
    const [, date, description] = result.match(/^([^\|]+)\|(.*$)/);
    return {
      date,
      description
    };
  };
}
