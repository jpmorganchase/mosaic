import cp from 'child_process';
import path from 'path';
import fs from 'fs-extra';

const gitChangeType = {
  A: 'add',
  D: 'delete',
  M: 'modify',
  R: 'rename'
} as const;

export type GitChangeTypeKeys = keyof typeof gitChangeType;
export type GitChangeTypeValues = typeof gitChangeType[GitChangeTypeKeys] | 'Unknown';

export type DiffResult = Array<{
  toString: () => string;
  type: GitChangeTypeValues;
  typeCode: GitChangeTypeKeys;
  file: string;
}>;

function getCloneDirName(repoUrl: string) {
  const [, projectNameAndRepoName] = path
    .normalize(repoUrl)
    .match(/([^/]+\/[^/]+)\.git$/) as RegExpMatchArray;

  return path.join(process.cwd(), '.tmp/.cloned_docs', projectNameAndRepoName);
}

function spawn(exe: string, args: string[], cwd: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const child = cp.spawn(exe, args, { cwd });

    const buffer: string[] = [];

    function handleExit(code: string) {
      if (code) {
        reject(new Error(`Command '${exe} ${args.join(' ')}' failed: ${code}. ${buffer.join('')}`));
      } else {
        resolve(buffer.join(''));
      }
    }

    const concatBuffer = (chunk: any) => buffer.push(chunk.toString());
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

async function* updatedFilesGenerator(
  repositoryAPI: InstanceType<typeof Repo>,
  disableAutoPullChanges = false
) {
  let lastSyncedRevision = await repositoryAPI.currentLocalRevision();

  while (true) {
    await repositoryAPI.fetch();
    const latestRevision = await repositoryAPI.latestRemoteRevision();

    if (
      latestRevision !== lastSyncedRevision &&
      latestRevision !== null &&
      lastSyncedRevision !== null
    ) {
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

async function doesPreviousCloneExist(repo: string, dir: string) {
  try {
    if (!(await fs.promises.stat(path.join(dir, '.git')))) {
      return false;
    }
    // Output will look something like:
    // origin	ssh://git@bitbucketdc-ssh.jpmchase.net:7999/x/x.git (fetch)
    const [, projectURI] = (await spawn('git', ['remote', '-v'], dir)).match(
      /\s+([^ ]+)/
    ) as RegExpMatchArray;
    return projectURI === repo;
  } catch (e) {
    return false;
  }
}

function stripCredentials(url: string) {
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

  constructor(credentials: string, remote = 'origin', branch: string, repo: string) {
    if (!repo) {
      throw new Error('Repo is a required option.');
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
    callback: (files: DiffResult | null) => void,
    errCallback: (e: unknown) => void,
    disableAutoPullChanges = false,
    updateInterval = 15 * 60 * 1000
  ) {
    const updatedFilesGen = updatedFilesGenerator(this, disableAutoPullChanges);

    let intervalId: NodeJS.Timer | null = setInterval(async () => {
      try {
        const { value: updatedFiles } = await updatedFilesGen.next();

        if (updatedFiles && (disableAutoPullChanges || updatedFiles.length)) {
          callback(updatedFiles);
        }
      } catch (e: unknown) {
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

  async diff(latestRevision: string): Promise<DiffResult> {
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
          type: gitChangeType[typeCode as GitChangeTypeKeys] || 'Unknown',
          typeCode: typeCode as GitChangeTypeKeys,
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
      return null;
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

  getLatestCommitDate = async (page: string): Promise<number> => {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    const result = await spawn(
      'git',
      ['log', '-1', '--format="%ci"', '--date=iso', '--', `${page}`],
      this.#dir
    );

    if (!result) {
      return new Date().getTime();
      //throw new Error(`No date found for '${page}'`);
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
        console.debug(
          `[PullDocs] Creating linked worktree repo '${this.#name} branch '${this.#branch}'`
        );
        await spawn('git', ['worktree', 'add', '-f', this.#dir, this.#branch], this.#cloneRootDir);
      } else {
        console.debug(
          `[PullDocs] Re-using linked worktree repo '${this.#name} branch '${this.#branch}'`
        );
        await this.pull();
      }
    } catch (e) {
      this.#cloned = false;
      throw e;
    }
  }

  getTagInfo = async (tag: string) => {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    const result = await spawn('git', ['show', '-s', '--format="%ci|%B"', tag], this.#dir);
    const [, date, description] = result.match(/^([^\|]+)\|(.*$)/) as RegExpMatchArray;
    return {
      date,
      description
    };
  };
}
