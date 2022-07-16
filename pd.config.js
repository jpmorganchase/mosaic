const path = require("path");

module.exports = {
    pageExtensions: ['.mdx', '.md'],
    serialisers: [
        { modulePath: require.resolve('@pull-docs/serialisers/dist/mdx'), filter: /\.mdx$/, options: {} },
        { modulePath: require.resolve('@pull-docs/serialisers/dist/md'), filter: /\.md$/, options: {} },
    ],
    plugins: [
        {
            modulePath: require.resolve('@pull-docs/plugins/dist/TagPlugin'),
            options: {}
        },
        {
            modulePath: require.resolve('@pull-docs/plugins/dist/NextPrevPagePlugin'),
            options: {
                filename: 'next-prev-links.json'
            },
            priority: 2
        },
        {
            modulePath: require.resolve('@pull-docs/plugins/dist/CodeModPlugin'),
            options: {},
            // Make sure this happens as the very first plugin, so it can fix any page issues
            priority: 100
        },
        {
            modulePath: require.resolve('@pull-docs/plugins/dist/PagesWithoutFileExtPlugin'),
            options: {
                stripExt: '.mdx'
            },
            // Make sure this happens early on, as it creates aliases for pages, which other plugins may reference
            priority: 99
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
            options: {
                rootDir: path.join(__dirname, '../developer-docs', 'docs'),
                cache: false,
                extensions: ['.mdx', '.md', '.json']
            }
        },
        {
            modulePath: require.resolve('@pull-docs/source-bitbucket'),
            options: {
                cache: false,
                // TODO: Enter credentials (this can be done at `pullDocs.addSource`, or in the config file here)
                credentials: 'r698001:Njc4ODkxNDc0NTgyOj2E8RRlgGRtkmhhQrVaAjo/lB4d',
                namespaceDir: 'bitbucket',
                subfolder: 'docs',
                repo: 'bitbucketdc.jpmchase.net/scm/devconsole/developer-docs.git',
                branch: 'develop',
                extensions: ['.mdx', '.md'],
                remote: 'origin'
            }
        }
    ]
}