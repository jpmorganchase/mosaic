import { describe, expect, test } from 'vitest';

import { parseBitbucketRepoUrl } from '../plugins/bitbucketRepoUrl';

const PROJ_REPO = { projectKey: 'proj', repoSlug: 'repo' };

describe('GIVEN parseBitbucketRepoUrl', () => {
  test.each([
    ['https://bitbucketdc.example.com/scm/PROJ/repo.git'],
    ['https://bitbucketdc.example.com/scm/proj/repo'],
    ['http://bitbucketdc.example.com:7990/scm/PROJ/repo.git'],
    ['https://bitbucketdc.example.com/bitbucket/scm/PROJ/repo.git'],
    ['https://user:p%40ss@bitbucketdc.example.com/scm/PROJ/repo.git'],
    ['ssh://git@bitbucketdc-ssh.example.com:7999/proj/repo.git'],
    ['ssh://git@bitbucketdc-ssh.example.com/PROJ/Repo.git'],
    ['git@bitbucketdc-ssh.example.com:PROJ/repo.git'],
    ['https://bitbucketdc.example.com/projects/PROJ/repos/repo'],
    ['https://bitbucketdc.example.com/projects/PROJ/repos/repo/browse/docs?at=main'],
    ['  https://bitbucketdc.example.com/scm/PROJ/repo.git  ']
  ])('THEN %s is PROJ/repo', url => {
    expect(parseBitbucketRepoUrl(url)).toEqual(PROJ_REPO);
  });

  test('THEN personal repositories keep their ~user project key', () => {
    expect(parseBitbucketRepoUrl('https://bitbucketdc.example.com/scm/~A123456/notes.git')).toEqual(
      { projectKey: '~a123456', repoSlug: 'notes' }
    );
    expect(
      parseBitbucketRepoUrl('ssh://git@bitbucketdc-ssh.example.com:7999/~a123456/notes.git')
    ).toEqual({ projectKey: '~a123456', repoSlug: 'notes' });
  });

  test.each([
    ['https://github.com/jpmorganchase/mosaic.git'],
    ['https://bitbucketdc.example.com/scm/PROJ/repo.git/extra'],
    ['https://bitbucketdc.example.com/scm/PROJ'],
    ['ssh://git@bitbucketdc-ssh.example.com:7999/repo.git'],
    ['ssh://git@bitbucketdc-ssh.example.com:7999/group/sub/repo.git'],
    ['file:///repos/PROJ/repo.git'],
    ['not a url'],
    ['']
  ])('THEN %s is not a Bitbucket repository URL', url => {
    expect(parseBitbucketRepoUrl(url)).toBeUndefined();
  });
});
