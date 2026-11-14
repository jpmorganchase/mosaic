/**
 * Tests for the `startSave` Server Action: it checks the caller and the
 * input, then starts the save on the Mosaic CLI with
 * `POST /workflows/jobs` and returns the job id.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.fn();
const isAuthorizedEditorMock = vi.fn();
vi.mock('../../../../auth', () => ({
  auth: authMock,
  isAuthorizedEditor: isAuthorizedEditorMock
}));

const fetchMock = vi.fn();

async function loadAction() {
  vi.resetModules();
  return import('../persistAction');
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function sentRequest() {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return {
    url,
    method: init.method,
    headers: init.headers as Record<string, string>,
    body: JSON.parse(init.body as string)
  };
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('MOSAIC_WORKFLOWS_URL', 'http://cli.test:8080/');
  vi.stubEnv('MOSAIC_WORKFLOWS_SECRET', 'workflows-secret');
  authMock.mockResolvedValue({ user: { name: 'Dev User', email: 'dev@mosaic.local' } });
  isAuthorizedEditorMock.mockReturnValue(true);
  fetchMock.mockResolvedValue(jsonResponse(202, { jobId: 'job-1' }));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('startSave', () => {
  it('forwards the author message with normalized newlines', async () => {
    const { startSave } = await loadAction();
    await startSave({
      route: '/mosaic/index',
      markdown: '# Changed',
      commitMessage: 'Summary\r\n\r\nBody'
    });
    expect(sentRequest().body.commitMessage).toBe('Summary\n\nBody');
  });

  it.each(['', ' \n ', 'NUL\0', 'é'.repeat(4097), 42])(
    'rejects an invalid author message before contacting CLI',
    async commitMessage => {
      const { startSave } = await loadAction();
      expect(
        await startSave({ route: '/mosaic/index', markdown: '# Changed', commitMessage } as never)
      ).toHaveProperty('error');
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );
  it('starts the save workflow on the CLI and returns the job id', async () => {
    const { startSave } = await loadAction();
    const result = await startSave({
      route: '/mosaic/index',
      markdown: '# Hello',
      frontmatter: 'title: Hi'
    });

    expect(result).toEqual({ jobId: 'job-1' });
    const request = sentRequest();
    expect(request.url).toEqual('http://cli.test:8080/workflows/jobs');
    expect(request.method).toEqual('POST');
    expect(request.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer workflows-secret'
    });
    expect(request.body).toEqual({
      name: 'save',
      user: { sid: 'dev@mosaic.local', name: 'Dev User', email: 'dev@mosaic.local' },
      route: '/mosaic/index',
      markdown: '# Hello',
      frontmatter: 'title: Hi'
    });
  });

  it('only forwards a rename and the new-page flag when they apply', async () => {
    const { startSave } = await loadAction();
    await startSave({ route: '/mosaic/a', targetRoute: '/mosaic/a', markdown: '#' });
    await startSave({ route: '/mosaic/a', targetRoute: '/mosaic/b', markdown: '#' });
    await startSave({ route: '/mosaic/new', markdown: '#', isNewPage: true });

    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body));
    expect(bodies[0]).not.toHaveProperty('targetRoute');
    expect(bodies[0]).not.toHaveProperty('isNewPage');
    expect(bodies[1]).toMatchObject({ targetRoute: '/mosaic/b' });
    expect(bodies[2]).toMatchObject({ isNewPage: true });
  });

  it.each([
    ['ws://cli.test:8080/workflows', 'http://cli.test:8080/workflows/jobs'],
    ['wss://cli.test/workflows/', 'https://cli.test/workflows/jobs'],
    ['ws://cli.test:8080', 'http://cli.test:8080/workflows/jobs']
  ])('accepts the old WebSocket URL %s with a one-time warning', async (configured, url) => {
    vi.stubEnv('MOSAIC_WORKFLOWS_URL', configured);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { startSave } = await loadAction();

    await startSave({ route: '/mosaic/index', markdown: '# Hi' });
    await startSave({ route: '/mosaic/index', markdown: '# Hi' });

    expect(fetchMock.mock.calls[0][0]).toEqual(url);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/MOSAIC_WORKFLOWS_URL=.* is a WebSocket URL/);
  });

  it.each([
    ['http://cli.test:8080', 'http://cli.test:8080/workflows/jobs'],
    ['http://cli.test:8080/', 'http://cli.test:8080/workflows/jobs'],
    ['https://cli.test/workflows', 'https://cli.test/workflows/jobs']
  ])('uses the HTTP URL %s without a warning', async (configured, url) => {
    vi.stubEnv('MOSAIC_WORKFLOWS_URL', configured);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { startSave } = await loadAction();

    await startSave({ route: '/mosaic/index', markdown: '# Hi' });

    expect(fetchMock.mock.calls[0][0]).toEqual(url);
    expect(warn).not.toHaveBeenCalled();
  });

  it('returns the error the CLI reports', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: '/mosaic/index not found' }));
    const { startSave } = await loadAction();
    expect(await startSave({ route: '/mosaic/index', markdown: '# Hi' })).toEqual({
      error: '/mosaic/index not found'
    });
  });

  it('describes a CLI failure without an error message', async () => {
    fetchMock.mockResolvedValue(new Response('Bad gateway', { status: 502 }));
    const { startSave } = await loadAction();
    expect(await startSave({ route: '/mosaic/index', markdown: '# Hi' })).toEqual({
      error: 'The workflows backend responded with 502.'
    });
  });

  it('reports a CLI that cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { startSave } = await loadAction();
    expect(await startSave({ route: '/mosaic/index', markdown: '# Hi' })).toEqual({
      error: 'Could not reach the workflows backend.'
    });
  });

  it.each([
    [{ route: '/mosaic/../../etc/passwd', markdown: '# Hi' }, 'Invalid page route.'],
    [
      { route: '/mosaic/index', targetRoute: '/mosaic\\x.mdx', markdown: '# Hi' },
      'Invalid target route.'
    ],
    [{ route: '/mosaic/index', markdown: 42 }, 'Invalid page content.'],
    [{ route: '/mosaic/index', markdown: '# Hi', isNewPage: 'yes' }, 'Invalid save request.']
  ])('rejects invalid input %j without contacting the CLI', async (input, error) => {
    const { startSave } = await loadAction();
    expect(await startSave(input as never)).toEqual({ error });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // '€' is one UTF-16 code unit but three UTF-8 bytes, so these are under
  // the caps by `.length` and over them in bytes.
  it.each([
    [{ route: '/mosaic/index', markdown: '€'.repeat(1024 * 1024) }, 'Invalid page content.'],
    [
      { route: '/mosaic/index', markdown: '# Hi', frontmatter: '€'.repeat(128 * 1024) },
      'Invalid frontmatter.'
    ]
  ])('measures the size caps in UTF-8 bytes (%#)', async (input, error) => {
    const { startSave } = await loadAction();
    expect(await startSave(input as never)).toEqual({ error });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects visitors who are not signed in', async () => {
    authMock.mockResolvedValue(null);
    const { startSave } = await loadAction();
    expect(await startSave({ route: '/mosaic/index', markdown: '# Hi' })).toEqual({
      error: 'Not authenticated.'
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects users who are not editors', async () => {
    isAuthorizedEditorMock.mockReturnValue(false);
    const { startSave } = await loadAction();
    expect(await startSave({ route: '/mosaic/index', markdown: '# Hi' })).toEqual({
      error: 'You are not allowed to edit this site.'
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses to run without a workflows secret', async () => {
    vi.stubEnv('MOSAIC_WORKFLOWS_SECRET', '');
    const { startSave } = await loadAction();
    expect(await startSave({ route: '/mosaic/index', markdown: '# Hi' })).toEqual({
      error: 'MOSAIC_WORKFLOWS_URL and MOSAIC_WORKFLOWS_SECRET must both be configured.'
    });
    expect(authMock).not.toHaveBeenCalled();
  });
});

describe('getSaveDefaults', () => {
  it('authenticates, forwards only selection fields and returns only public defaults', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        supportsCommitMessage: true,
        commitMessage: 'Default\r\nBody',
        credentials: 'private'
      })
    );
    const { getSaveDefaults } = await loadAction();
    expect(
      await getSaveDefaults({
        route: '/mosaic/new',
        isNewPage: true,
        targetRoute: '/mosaic/newer',
        source: 'other',
        markdown: 'ignored'
      } as never)
    ).toEqual({ supportsCommitMessage: true, commitMessage: 'Default\nBody' });
    expect(sentRequest()).toMatchObject({
      url: 'http://cli.test:8080/workflows/defaults',
      headers: { Authorization: 'Bearer workflows-secret' },
      body: { name: 'save', route: '/mosaic/new', isNewPage: true, targetRoute: '/mosaic/newer' }
    });
    expect(sentRequest().body).not.toHaveProperty('source');
    expect(sentRequest().body).not.toHaveProperty('markdown');
  });
  it('keeps unsupported workflows explicit', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { supportsCommitMessage: false, options: 'private' })
    );
    const { getSaveDefaults } = await loadAction();
    expect(await getSaveDefaults({ route: '/mosaic/index' })).toEqual({
      supportsCommitMessage: false
    });
  });
  it('rejects non-editors and unsafe inputs without a backend request', async () => {
    const { getSaveDefaults } = await loadAction();
    isAuthorizedEditorMock.mockReturnValue(false);
    expect(await getSaveDefaults({ route: '/mosaic/index' })).toEqual({
      error: 'You are not allowed to edit this site.'
    });
    isAuthorizedEditorMock.mockReturnValue(true);
    expect(await getSaveDefaults({ route: '/../index' })).toEqual({ error: 'Invalid page route.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('does not return backend configuration on malformed responses or errors', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: 'private configuration' }));
    const { getSaveDefaults } = await loadAction();
    expect(await getSaveDefaults({ route: '/mosaic/index' })).toEqual({
      error: 'Could not load the commit message. Try again.'
    });
  });
});
