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

function getProjectNameAndRepoName(repoUrl: string) {
  const [, projectNameAndRepoName] = new URL(repoUrl).pathname.match(
    /([^/]+\/[^/]+)\.git$/
  ) as RegExpMatchArray;
  const [projectName, repoName] = projectNameAndRepoName.split('/');
  return {
    projectNameAndRepoName,
    projectName,
    repoName
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function getCloneDirName(repoUrl: string) {
  const { projectNameAndRepoName } = getProjectNameAndRepoName(repoUrl);

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
    // origin	https://github_pat_xxxxxxxx@github.com/username/reponame.git (fetch)
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

function createRepoURL(repo: string, credentials: string) {
  let repoPath;
  let repoProtocol;
  try {
    const { protocol, hostname, pathname } = new URL(repo);
    repoProtocol = protocol;
    repoPath = `${hostname}${pathname}`;
  } catch {
    repoProtocol = 'https:';
    repoPath = repo;
  }
  let encodedCredentials;
  if (credentials) {
    encodedCredentials = credentials
      .split(':')
      .map(credential => encodeURIComponent(credential))
      .join(':');
  }
  const repoURL = encodedCredentials
    ? `${repoProtocol}//${encodedCredentials}@${repoPath}`
    : `${repoProtocol}//${repoPath}`;
  return repoURL;
}

export default class Repo {
  #cloned = false;
  #dir = '';
  #cloneRootDir = '';
  #worktreeRootDir = '';
  #remote = '';
  #name = '';
  #branch = '';
  #repo = '';
  #credentials: string | null = null;

  constructor(credentials: string, remote = 'origin', branch: string, repo: string) {
    if (!repo) {
      throw new Error('Repo is a required option.');
    }
    if (!credentials) {
      console.warn('[Mosaic] No `credentials` provided for git repo request.');
    }

    this.#cloneRootDir = getCloneDirName(repo);
    this.#worktreeRootDir = path.join(this.#cloneRootDir, '.mosaic-worktrees');
    this.#dir = path.join(this.#worktreeRootDir, branch);
    this.#remote = remote;
    this.#branch = branch;
    this.#credentials = credentials;
    this.#repo = createRepoURL(repo, credentials);

    // Hide credentials when displaying repository name
    this.#name = `${stripCredentials(this.#repo)}#${branch}`;
  }

  get name() {
    return this.#name;
  }

  get dir() {
    return this.#dir;
  }

  get projectName() {
    return getProjectNameAndRepoName(this.#repo).projectName;
  }

  get repoName() {
    return getProjectNameAndRepoName(this.#repo).repoName;
  }

  onCommitChange(
    callback: (files: DiffResult | null) => void,
    errCallback: (e: unknown) => void,
    disableAutoPullChanges: boolean,
    updateInterval: number
  ) {
    const updatedFilesGen = updatedFilesGenerator(this, disableAutoPullChanges);

    let intervalId: NodeJS.Timer | null = setInterval(async () => {
      try {
        if (this.#cloned) {
          const { value: updatedFiles } = await updatedFilesGen.next();

          if (updatedFiles && (disableAutoPullChanges || updatedFiles.length)) {
            callback(updatedFiles);
          }
        }
      } catch (e: unknown) {
        console.warn(`[Mosaic] Unsubscribing from \`onCommitChange\` for ${this.name}`);
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
    return spawn('git', ['reset', `${this.#remote}/${this.#branch}`, '--hard'], this.#dir);
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
      console.warn('[Mosaic] No revision found for HEAD');
      return null;
    }
    return result ? result.trim() : '';
  }

  async latestRemoteRevision() {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }
    const result = await spawn('git', ['rev-parse', `${this.#remote}/${this.#branch}`], this.#dir);

    if (!result) {
      console.warn(`[Mosaic] No revision found for tag ${this.#branch}`);
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
      if (!(await doesPreviousCloneExist(this.#repo, this.#cloneRootDir))) {
        console.debug(`[Mosaic] Creating main worktree for repo '${this.#name}'`);
        await fs.emptyDir(this.#cloneRootDir);
        await spawn(
          'git',
          ['clone', this.#repo, '--no-checkout', `--origin=${this.#remote}`],
          // Go up 1 dir, so the clone creates the main worktree folder
          path.dirname(this.#cloneRootDir)
        );
      } else {
        console.debug(`[Mosaic] Re-using main worktree for repo '${this.#name}'`);
      }
      this.#cloned = true;
      if (!(await doesPreviousCloneExist(this.#repo, this.#dir))) {
        console.debug(
          `[Mosaic] Creating linked worktree repo '${this.#name} branch '${this.#branch}'`
        );
        await spawn('git', ['worktree', 'add', '-f', this.#dir, this.#branch], this.#cloneRootDir);
      } else {
        console.debug(
          `[Mosaic] Re-using linked worktree repo '${this.#name} branch '${this.#branch}'`
        );
        await this.pull();
      }
    } catch (e) {
      this.#cloned = false;
      throw e;
    }
  }

  async createWorktree(sid: string, branchName: string) {
    this.#dir = path.posix.join(this.#worktreeRootDir, sid);
    console.debug(`[Mosaic] Creating worktree for content save @ ${this.#dir}`);
    await spawn(
      'git',
      ['worktree', 'add', '-f', '-B', branchName, this.#dir, `${this.#remote}/${this.#branch}`],
      this.#worktreeRootDir
    );
    console.debug(`[Mosaic] Creating linked worktree for ${sid}`);
  }

  async removeWorktree(sid: string) {
    console.debug(`[Mosaic] Removing worktree for content save @ ${this.#dir}`);
    await spawn('git', ['worktree', 'remove', sid, '--force'], this.#dir);
    this.#dir = path.join(this.#worktreeRootDir, this.#branch);
    console.debug(`[Mosaic] Removed linked worktree for ${sid}`);
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

  async configureGitUser(name: string, email: string) {
    await spawn('git', ['config', 'user.name', `${name}`], this.#dir);
    await spawn('git', ['config', 'user.email', `${email}`], this.#dir);
  }

  async addChanges() {
    await spawn('git', ['add', '-A'], this.#dir);
  }

  async commitChanges(name: string, email: string, commitMessage: string) {
    await spawn(
      'git',
      ['commit', '-m', `${commitMessage}`, '--author', `${name}<${email}>`],
      this.#dir
    );
  }

  async pushBranch(branchName: string) {
    await spawn('git', ['push', 'origin', `${branchName}`], this.#dir);
  }

  async curlPullRequest(endpoint: string, data: string) {
    const curlResponse = await spawn(
      'curl',
      [
        '--silent',
        `${endpoint}`,
        '--request',
        'POST',
        '--header',
        'Content-Type: application/json',
        '-u',
        `${this.#credentials}`,
        '-d',
        `${data}`
      ],
      this.#dir
    );

    return curlResponse;
  }

  async createPullRequest(
    user: { sid: string; name: string; email: string },
    branchName: string,
    filePath: string,
    endpoint: string,
    requestData: string,
    commitMessage: string
  ): Promise<string | { error: string; source: string }> {
    if (!this.#cloned) {
      throw new Error('No repository cloned. Call init() to clone the initial repository.');
    }

    const sid = user.sid.toLowerCase();
    try {
      await this.configureGitUser(user.name, user.email);
      await this.addChanges();
      await this.commitChanges(user.name, user.email, commitMessage);
      await this.pushBranch(branchName);
      const curlResult = await this.curlPullRequest(endpoint, requestData);
      const jsonResult = await JSON.parse(curlResult);

      if (jsonResult.errors) {
        throw new Error(jsonResult.errors?.[0].message);
      }
      return jsonResult;
    } catch (e: unknown) {
      console.group('[Mosaic] Pull Request Error');
      console.log('fullPath', filePath);
      console.log('Branch Name', branchName);
      console.log('Name', this.#name);
      console.log('Remote', this.#remote);
      console.error(e);
      console.groupEnd();
      return {
        error: `Error creating Pull Request: ${getErrorMessage(e)} `,
        source: `${this.#name}`
      };
    } finally {
      await this.removeWorktree(sid);
    }
  }
}
