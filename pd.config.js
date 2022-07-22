const path = require("path");

module.exports = {
    pageExtensions: ['.mdx', '.json'],
    ignorePages: ['shared-config.json', 'sitemap.xml', 'sidebar.json'],
    // TODO
    // lazyLoadPages: true,
    serialisers: [
        { modulePath: require.resolve('@pull-docs/serialisers/dist/mdx'), filter: /\.mdx$/, options: {} },
        { modulePath: require.resolve('@pull-docs/serialisers/dist/md'), filter: /\.md$/, options: {} },
    ],
    plugins: [
        {
            modulePath: require.resolve('@pull-docs/plugins/dist/SiteMapPlugin'),
            options: {
            }
        },
        {
            modulePath: require.resolve('@pull-docs/plugins/dist/LazyPagePlugin'),
            // This plugin must be the very last to run, so it can strip off metadata and content after the other
            // plugins are done with them
            priority: -2,
            // Exclude this plugin in builds
            runTimeOnly: true,
            options: {
                cacheDir: '.tmp/.pull-docs-last-page-plugin-cache'
            }
        },
        {
            modulePath: require.resolve('@pull-docs/plugins/dist/NextPrevPagePlugin'),
            options: {
                // Make sure the index is always the first item in the next/prev queue
                indexFirst: true,
                // Sort alphabetically
                sortBy: 'a-z'
            },
            priority: 2
        },
        // TODO: Remove this plugin once the docs add file extensions in refs
        {
            modulePath: require.resolve('@pull-docs/plugins/dist/PagesWithoutFileExtPlugin'),
            options: {
            }
        },
        {
            modulePath: require.resolve('@pull-docs/plugins/dist/SidebarPlugin'),
            options: {
                filename: 'sidebar.json'
            }
        },
        {
            modulePath: require.resolve('@pull-docs/plugins/dist/SharedConfigPlugin'),
            options: {
                filename: 'shared-config.json'
            },
            priority: 3
        }
    ],
    sources: [
        {
            modulePath: require.resolve('@pull-docs/source-local-folder'),
            namespace: 'local',
            options: {
                rootDir: path.join(__dirname, '../developer-docs', 'docs'),
                cache: false,
                extensions: ['.mdx']
            }
        },
        {
            modulePath: require.resolve('@pull-docs/source-bitbucket'),
            namespace: 'developer',
            options: {
                cache: false,
                // TODO: Enter credentials (this can be done at `pullDocs.addSource`, or in the config file here)
                credentials: 'r698001:Njc4ODkxNDc0NTgyOj2E8RRlgGRtkmhhQrVaAjo/lB4d',
                prefixDir: 'developer',
                subfolder: 'docs',
                repo: 'bitbucketdc.jpmchase.net/scm/devconsole/developer-docs.git',
                branch: 'develop',
                extensions: ['.mdx'],
                remote: 'origin'
            }
        }
    ]
}