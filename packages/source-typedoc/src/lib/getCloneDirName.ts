import path from 'path';

export default function getCloneDirName(repo, branch) {
  const [, projectNameAndRepoName] = path.normalize(repo).match(/([^\\/]+[\\\/][^\\/]+)\.git$/);

  return path.join(process.cwd(), '.tmp', '.cloned_docs', `${projectNameAndRepoName}__${branch}`);
}
