/**
 * A Bitbucket Data Center repository, identified the way its webhook
 * payloads identify it. Both parts are lower-cased: Bitbucket matches
 * project keys and repository slugs case-insensitively.
 */
export interface BitbucketRepo {
  projectKey: string;
  repoSlug: string;
}

function fromSegments(projectKey: string | undefined, repo: string | undefined) {
  const repoSlug = repo?.replace(/\.git$/i, '');
  if (!projectKey || !repoSlug) return undefined;
  return { projectKey: projectKey.toLowerCase(), repoSlug: repoSlug.toLowerCase() };
}

function decode(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Reads the project key and repository slug from a Bitbucket Data Center
 * repository URL, or returns `undefined` for anything else:
 *
 * - HTTP(S) clone URLs: `https://host[/context]/scm/PROJ/repo.git`
 * - SSH clone URLs: `ssh://git@host:7999/PROJ/repo.git` and `git@host:PROJ/repo.git`
 * - Browse URLs: `https://host[/context]/projects/PROJ/repos/repo[/browse]`
 *
 * Personal repositories keep their `~user` project key. Credentials in the
 * URL are ignored. HTTP(S) URLs without `/scm/` or `/projects/…/repos/` (such
 * as GitHub's) are not Bitbucket clone URLs and return `undefined`; SSH URLs
 * carry no such marker, so any `PROJ/repo` path is accepted.
 */
export function parseBitbucketRepoUrl(url: string): BitbucketRepo | undefined {
  if (typeof url !== 'string') return undefined;
  const trimmed = url.trim();

  const scpLike = /^[^/@:]+@[^/:]+:(?!\/)(.+)$/.exec(trimmed);
  let protocol: string;
  let pathname: string;
  if (scpLike) {
    protocol = 'ssh:';
    pathname = `/${scpLike[1]}`;
  } else {
    try {
      ({ protocol, pathname } = new URL(trimmed));
    } catch {
      return undefined;
    }
  }

  const segments = pathname.split('/').filter(Boolean).map(decode);

  const projectsIndex = segments.findIndex(
    (segment, index) => segment === 'projects' && segments[index + 2] === 'repos'
  );
  if (projectsIndex >= 0) {
    return fromSegments(segments[projectsIndex + 1], segments[projectsIndex + 3]);
  }

  if (protocol === 'http:' || protocol === 'https:') {
    const scmIndex = segments.lastIndexOf('scm');
    if (scmIndex >= 0 && segments.length === scmIndex + 3) {
      return fromSegments(segments[scmIndex + 1], segments[scmIndex + 2]);
    }
    return undefined;
  }

  if (protocol === 'ssh:' && segments.length === 2) {
    return fromSegments(segments[0], segments[1]);
  }
  return undefined;
}
