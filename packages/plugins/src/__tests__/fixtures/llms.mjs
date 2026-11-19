import { Volume } from 'memfs';
import { mergeWith } from 'lodash-es';
import LlmsTxtPlugin from '../../LlmsTxtPlugin';
import FileAccess from '../../../../core/src/filesystems/FileAccess';
import MutableVolume from '../../../../core/src/filesystems/MutableVolume';
import createConfig from '../../../../core/src/helpers/createConfig';
import mdx from '../../../../serialisers/src/mdx';

export const document = (route, title, extra = {}) =>
  `---\n${JSON.stringify({
    fullPath: `${route}.mdx`,
    route,
    title,
    ...extra
  })}\n---\n# ${title}\n\n${title} content.\n`;

// Two independent sources deliberately share an internal namespace while their
// public prefixes differ. A third mounts below an overlapping public scope.
export const sources = [
  {
    namespace: 'shared',
    prefixDir: 'salt',
    files: {
      '/salt/index.mdx': document('/salt/index', 'Salt', { description: 'Salt docs.' }),
      '/salt/components/button.mdx': document('/salt/components/button', 'Button', {
        data: { description: 'Starts an action.' }
      })
    }
  },
  {
    namespace: 'shared',
    prefixDir: 'mosaic',
    files: {
      '/mosaic/index.mdx': document('/mosaic/index', 'Mosaic'),
      '/mosaic/setup.mdx': document('/mosaic/setup', 'Setup')
    }
  },
  {
    namespace: 'examples',
    prefixDir: '',
    files: {
      '/salt/components/advanced/index.mdx': document(
        '/salt/components/advanced/index',
        'Advanced'
      ),
      '/salted/index.mdx': document('/salted/index', 'Salted'),
      '/about.mdx': document('/about', 'About')
    }
  }
];

export function fixture() {
  const shared = new MutableVolume(new FileAccess(new Volume()), '*');
  const configs = new Map();
  return {
    shared,
    async update(id, files, options = {}, namespace = 'shared', aliases = {}) {
      const config = createConfig();
      const filesystem = new MutableVolume(new FileAccess(Volume.fromJSON(files)), namespace);
      for (const [alias, target] of Object.entries(aliases)) {
        await filesystem.promises.mkdir(alias.slice(0, alias.lastIndexOf('/')), {
          recursive: true
        });
        await filesystem.promises.symlink(target, alias);
      }
      await LlmsTxtPlugin.$beforeSend(
        filesystem,
        {
          config,
          namespace,
          serialiser: mdx,
          ignorePages: ['ignored.mdx'],
          pageExtensions: ['.mdx']
        },
        options
      );
      configs.set(id, config);
    },
    async publish(options = {}) {
      const data = [...configs.values()].reduce(
        (all, config) =>
          mergeWith(all, config.data, (a, b) => (Array.isArray(a) ? a.concat(b) : undefined)),
        {}
      );
      await LlmsTxtPlugin.afterUpdate(
        shared,
        { sharedFilesystem: shared, globalConfig: { data } },
        options
      );
      return Object.fromEntries(
        Object.entries(shared.toJSON()).filter(([, value]) => typeof value === 'string')
      );
    }
  };
}

export async function populatedFixture(options = {}) {
  const site = fixture();
  for (const [index, source] of sources.entries()) {
    await site.update(String(index), source.files, options, source.namespace);
  }
  return site;
}
