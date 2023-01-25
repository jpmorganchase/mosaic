import cp from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import getCloneDirName from '../getCloneDirName';
const gitChangeType = {
  A: 'add',
  D: 'delete',
  M: 'modify',
  R: 'rename'
};
// Returns a function that when called, will defer for {timeout}ms and collect the args of every
// call made to it within that time. It will then invoke {promiseFn} with those args spread.
// If {maxSize} is reached before the {timeout} expires, the function will be called immediately.
function batchPromiseCallback(promiseFn, maxSize = 200, timeout = 0) {
  let intervalId;
  let batchedArgs = [];
  let resolvers = [];
  function invokeFn() {
    const currentResolvers = resolvers;
    intervalId = 0;
    promiseFn(...batchedArgs)
      .then(results => currentResolvers.forEach((resolve, i) => resolve(results[i])))
      .catch(console.error);
    batchedArgs = [];
    resolvers = [];
  }
  return arg => {
    batchedArgs.push(arg);
    if (!intervalId) {
      intervalId = setTimeout(invokeFn, timeout);
    }
    const resultPromise = new Promise(resolve => resolvers.push(resolve));
    // If max size is reached, call immediately
    if (batchedArgs.length === maxSize) {
      clearInterval(intervalId);
      invokeFn();
    }
    return resultPromise;
  };
}
function spawn(exe, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = cp.spawn(exe, args, { cwd });
    const buffer = [];
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
    child.on('close', handleExit);
    child.on('exit', handleExit);
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
async function doesPreviousCloneExist(repo, dir, branch) {
  try {
    if (!(await fs.promises.stat(path.join(dir, '.git')))) {
      return false;
    }
    // Output will look something like:
    // origin	ssh://git@bitbucketdc-ssh.jpmchase.net:7999/x/x.git (fetch)
    const [, projectURI] = (await spawn('git', ['remote', '-v'], dir)).match(/\s+([^ ]+)/);
    if (projectURI === repo) {
      const existingBranchName = (
        await spawn('git', ['rev-parse', '--abbrev-ref', 'HEAD'], dir)
      ).trim();
      return existingBranchName === branch;
    }
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
  #depth = 1;
  #remote = '';
  #name = '';
  #branch = '';
  #repo = '';
  constructor({ credentials, depth = 1, remote = 'origin', branch, repo }) {
    if (!repo) {
      throw new Error('Missing required options `repo`.');
    }
    if (!credentials) {
      console.warn('No `credentials` provided for bitbucket request.');
    }
    this.#dir = getCloneDirName(repo, branch);
    this.#depth = depth;
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
  async onCommitChange(
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
        console.warn(`Unsubscribing from \`onCommitChange\` for ${this.name}`);
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
      console.warn(
        `No revision found for 'HEAD' when running \`git rev-parse HEAD\` in '${this.#dir}' for '${
          this.#name
        }'`
      );
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
      console.warn(
        `No revision found for tag '${this.#branch}' when running \`git rev-parse ${
          this.#branch
        }\` in '${this.#dir}' for '${this.#name}'`
      );
      return null;
    }
    return result.trim();
  }
  getLatestCommitDate = batchPromiseCallback(async (...args) => {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    const result = await spawn(
      'git',
      [
        'log',
        '-1',
        '--format="%ai"',
        '--',
        args.map(file => `**/${file.replace(/^\//, '')}`).join(' ')
      ],
      this.#dir
    );
    return result
      .split('\n')
      .map(line => new Date(line ? Date.parse(line.trim().replace(/"/g, '')) : 0));
  });
  fetch() {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    return spawn('git', ['fetch', '--all'], this.#dir);
  }
  async init() {
    try {
      if (!(await doesPreviousCloneExist(this.#repo, this.#dir, this.#branch))) {
        fs.emptyDirSync(this.#dir);
        await spawn(
          'git',
          [
            'clone',
            this.#repo,
            this.#dir,
            '--branch',
            this.#branch,
            '--single-branch',
            '--origin',
            this.#remote,
            '--depth',
            this.#depth
          ],
          path.join(process.cwd(), '.tmp/.cloned_docs')
        );
      }
      this.#cloned = true;
      if (!(await this.hasLatestChanges())) {
        console.debug('Repository is out of date. Updating.');
        await this.reset();
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
    const result = await spawn('git', ['log', '--format=%ci|%B', tag], this.#dir);
    const [date, description] = result.split('|');
    return {
      date,
      description
    };
  };
}
