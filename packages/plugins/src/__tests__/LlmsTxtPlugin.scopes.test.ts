import { afterEach, expect, test, vi } from 'vitest';
import { document, fixture, populatedFixture, sources } from './fixtures/llms.mjs';
import * as converter from '../utils/toMarkdown';

const options = {
  title: 'Documentation',
  siteUrl: 'https://docs.example.com/',
  scopes: [
    { path: '/Salt/', title: 'Salt Design System', description: 'Salt component documentation' },
    { path: '/mosaic', title: 'Mosaic' },
    { path: '/salt/components', title: 'Components' }
  ]
};

afterEach(() => vi.restoreAllMocks());

test('preserves the pre-scopes global artifacts byte for byte across multiple public prefixes', async () => {
  const site = await populatedFixture();
  const files = await site.publish();
  expect(
    Object.fromEntries(
      ['/llms.txt', '/llms-full.txt', '/markdown-pages.json'].map(file => [file, files[file]])
    )
  ).toMatchSnapshot();
});

test('indexes canonical public routes across shared namespaces, with inclusive parent scopes and specific discovery', async () => {
  const site = await populatedFixture(options);
  const files = await site.publish(options);
  const pages = JSON.parse(files['/markdown-pages.json']).pages;
  expect(files['/llms.txt']).toContain('## Documentation scopes');
  for (const route of Object.keys(pages)) expect(files['/llms.txt']).toContain(`${route}.md`);
  expect(files['/llms-full.txt']).toBe(Object.values(pages).join('\n'));
  expect(files['/salt/llms.txt']).toContain(
    '# Salt Design System\n\n> Salt component documentation'
  );
  expect(files['/salt/llms.txt']).toContain(
    'Button](https://docs.example.com/salt/components/button.md): Starts an action.'
  );
  expect(files['/salt/llms.txt']).toContain('/salt/components/advanced/index.md');
  expect(files['/salt/llms.txt']).not.toMatch(/\/mosaic|\/salted|\/about/);
  expect(files['/salt/components/llms.txt']).not.toContain('/salt/index.md');
  expect(files['/mosaic/llms.txt']).toContain('/mosaic/setup.md');
  expect(files['/mosaic/llms-full.txt']).not.toContain('Salt');
  expect(pages['/salt/components/button']).toContain(
    '[https://docs.example.com/salt/components/llms.txt]'
  );
  expect(pages['/salt/index']).toContain('[https://docs.example.com/salt/llms.txt]');
  expect(pages['/salted/index']).toContain('[https://docs.example.com/llms.txt]');
  expect(pages['/about']).toContain('[https://docs.example.com/llms.txt]');
});

test('matches a scope root and segment boundaries, and is independent of source and scope ordering', async () => {
  const a = await populatedFixture(options);
  await a.update('root', { '/salt.mdx': document('/salt', 'Root') });
  const first = await a.publish(options);
  const b = fixture();
  await b.update('root', { '/salt.mdx': document('/salt', 'Root') });
  for (const [index, source] of [...sources].reverse().entries())
    await b.update(String(index), source.files);
  expect(await b.publish({ ...options, scopes: [...options.scopes].reverse() })).toEqual(first);
  expect(first['/salt/llms.txt']).toContain('/salt.md');
  expect(first['/salt/llms.txt']).not.toContain('/salted/');
});

test.each([
  '',
  '/',
  'salt',
  '//salt',
  '/salt//a',
  '/salt/../a',
  '/salt/./a',
  '/salt?x',
  '/salt#x',
  '/salt\\a',
  '/salt/%2fsecret',
  '/salt/%2e%2e',
  '/salt/*',
  '/api',
  '/_next/data',
  '/salt/llms.txt',
  '/ salt'
])('rejects invalid scope %s', async path => {
  const site = fixture();
  await expect(site.update('a', {}, { scopes: [{ path }] })).rejects.toThrow(
    'Invalid llms.txt scope'
  );
});

test('rejects duplicates after normalization', async () => {
  const site = fixture();
  await expect(site.publish({ scopes: [{ path: '/Salt/' }, { path: '/salt' }] })).rejects.toThrow(
    'Duplicate'
  );
});

test('omits canonical collisions after trimming trailing slashes, including excluded claims', async () => {
  const site = fixture();
  await site.update('a', {
    '/salt/page.mdx': document('/salt/page', 'First'),
    '/salt/guide.mdx': document('/salt/guide/', 'Guide', { fullPath: '/salt/guide.mdx' })
  });
  await site.update('b', {
    '/other.mdx': document('/salt/page/', 'Excluded', {
      fullPath: '/other.mdx',
      llms: { exclude: true }
    })
  });
  const files = await site.publish(options);
  expect(Object.keys(JSON.parse(files['/markdown-pages.json']).pages)).toEqual(['/salt/guide']);
  expect(files['/salt/llms.txt']).toContain('/salt/guide.md');
  expect(files['/llms-full.txt']).not.toContain('First');
});

test('converts each backing page once, regardless of aliases or overlapping scopes', async () => {
  const spy = vi.spyOn(converter, 'toMarkdown');
  const site = fixture();
  await site.update('a', sources[0].files, options, 'shared', {
    '/mosaic/alias.mdx': '/salt/components/button.mdx',
    '/salt/copy.mdx': '/salt/components/button.mdx'
  });
  const files = await site.publish(options);
  expect(spy).toHaveBeenCalledTimes(2);
  expect(Object.keys(JSON.parse(files['/markdown-pages.json']).pages)).toEqual([
    '/salt/index',
    '/salt/components/button'
  ]);
  expect(files['/mosaic/llms-full.txt']).toBe('');
  await site.publish({ scopes: [{ path: '/salt' }] });
  expect(spy).toHaveBeenCalledTimes(2);
});

test('applies every exclusion to backing files, aliases and all artifacts', async () => {
  const site = fixture();
  const config = { ...options, exclude: ['salt/glob/**'] };
  await site.update(
    'a',
    {
      '/salt/hidden.mdx': document('/salt/hidden', 'SECRET', { llms: { exclude: true } }),
      '/salt/glob/hidden.mdx': document('/salt/glob/hidden', 'SECRET'),
      '/salt/ignored.mdx': document('/salt/ignored', 'SECRET'),
      '/salt/ok.mdx': document('/salt/ok', 'Public')
    },
    config,
    'shared',
    {
      '/mosaic/frontmatter.mdx': '/salt/hidden.mdx',
      '/mosaic/glob.mdx': '/salt/glob/hidden.mdx',
      '/mosaic/ignored-alias.mdx': '/salt/ignored.mdx'
    }
  );
  const files = await site.publish(config);
  for (const file of Object.values(files))
    expect(file).not.toMatch(/SECRET|hidden|ignored|frontmatter|glob/);
  expect(files['/salt/llms-full.txt']).toContain('Public');
});

test('omits ambiguous canonical routes across sources even when one claimant is excluded', async () => {
  const site = fixture();
  await site.update('a', {
    '/salt/a.mdx': document('/salt/a', 'Public', { route: '/salt/duplicate' })
  });
  await site.update('b', {
    '/mosaic/b.mdx': document('/mosaic/b', 'SECRET', {
      route: '/salt/duplicate',
      llms: { exclude: true }
    })
  });
  const files = await site.publish(options);
  expect(JSON.parse(files['/markdown-pages.json']).pages).toEqual({});
  for (const file of Object.values(files)) expect(file).not.toMatch(/Public|SECRET|duplicate/);
});

test('replaces refreshed/deleted pages and removes only previously owned scoped files', async () => {
  const site = await populatedFixture(options);
  await site.publish(options);
  await site.shared.promises.writeFile('/salt/authored.txt', 'keep');
  await site.update('0', { '/salt/new.mdx': document('/salt/new', 'New') });
  const updated = await site.publish({ scopes: [{ path: '/salt' }] });
  expect(updated['/salt/llms-full.txt']).not.toContain('Button');
  expect(updated['/salt/llms-full.txt']).toContain('New');
  expect(updated['/salt/components/llms.txt']).toBeUndefined();
  expect(updated['/mosaic/llms-full.txt']).toBeUndefined();
  expect(updated['/salt/authored.txt']).toBe('keep');
  const unscoped = await site.publish();
  expect(unscoped['/salt/llms.txt']).toBeUndefined();
  expect(unscoped['/llms.txt']).not.toContain('Documentation scopes');
  expect(JSON.parse(unscoped['/markdown-pages.json']).pages['/salt/new']).toContain('[/llms.txt]');
});

test('serializes concurrent publishes and leaves the last scope configuration accessible', async () => {
  const site = await populatedFixture();
  await Promise.all([site.publish(options), site.publish({ scopes: [{ path: '/mosaic' }] })]);
  expect(await site.shared.promises.exists('/salt/llms.txt')).toBe(false);
  expect(await site.shared.promises.exists('/mosaic/llms.txt')).toBe(true);
});
