const path = require("path");

module.exports = {
    pageExtensions: ['.mdx', '.json'],
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
                cacheDir: '.pull-docs-last-page-plugin-cache'
            }
        },
        {
            modulePath: require.resolve('@pull-docs/plugins/dist/NextPrevPagePlugin'),
            options: {
                // Start filename with a . so it does not get picked up by $refs
                filename: '.next-prev-links.json'
            },
            priority: 2
        },
        // TODO: Remove this plugin once the docs add file extensions in refs
        {
            modulePath: require.resolve('@pull-docs/plugins/dist/PagesWithoutFileExtPlugin'),
            options: {
            },
            // Make sure this happens early on, as it creates aliases for pages, which other plugins may reference
            priority: 99
        },
        {
            modulePath: require.resolve('@pull-docs/plugins/dist/SharedConfigPlugin'),
            options: {
                // Start filename with a . so it does not get picked up by $refs
                filename: '.shared-config.json'
            },
            priority: 3
        }
    ],
    sources: [
        {
            modulePath: require.resolve('@pull-docs/source-local-folder'),
            options: {
                rootDir: path.join(__dirname, '../developer-docs', 'docs'),
                cache: false,
                extensions: ['.mdx', '.json']
            }
        },
        {
            modulePath: require.resolve('@pull-docs/source-bitbucket'),
            options: {
                cache: false,
                // TODO: Enter credentials (this can be done at `pullDocs.addSource`, or in the config file here)
                credentials: 'r698001:Njc4ODkxNDc0NTgyOj2E8RRlgGRtkmhhQrVaAjo/lB4d',
                namespaceDir: 'developer',
                subfolder: 'docs',
                repo: 'bitbucketdc.jpmchase.net/scm/devconsole/developer-docs.git',
                branch: 'develop',
                extensions: ['.mdx', '.json'],
                remote: 'origin'
            }
        }
    ]
}