const deepmerge = require('deepmerge');
const mosaicConfig = require('@jpmorganchase/mosaic-standard-generator/dist/fs.config.js');

/** Enhance/modify your Mosaic core fs
 * pageExtensions: supported file extensions which can be stored in the Virtual File System (VFS) created by Core FS
 * ignorePages: list of files which will be ignored from pulled content,
 * serialisers: define serialisers and deserialisers for the supported file extensions
 * plugins: <...plugin definitions>
 * sources: <...source definitions>
 */
module.exports = deepmerge(mosaicConfig, {
  pageExtensions: ['.html'],
  sources: [
    {
      modulePath: '@jpmorganchase/mosaic-source-typedoc',
      namespace: 'typedocs', // each site has it's own namespace, think of this as your content's uid
      options: {
        // To run locally, enter your credentials to access the Git repo
        // e.g create the environment variable MOSAIC_DOCS_CLONE_CREDENTIALS
        // !! Polite Reminder... do not store credentials in code !!
        // For final deployments: you could put repo access credentials securely in environment variables provided by your host.
        // If running locally: create the environment variable MOSAIC_DOCS_CLONE_CREDENTIALS
        // export MOSAIC_DOCS_CLONE_CREDENTIALS="<repo username>:<Personal Access Token (PAT) provided by your Repo OR password>",
        credentials: process.env.BITBUCKET_CLONE_CREDENTIALS,
        prefixDir: 'typedocs', // root path used for namespace
        cache: true,
        subfolder: 'packages/components-next/html-docs', // subfolder within your branch containing the docs, typically 'docs'
        repo: 'bitbucketdc.jpmchase.net/scm/devconsole/digital-platform-docs.git', // repo url without any protocol
        branch: 'typedocs-current', // branch where docs are pulled from
        extensions: ['.html'], // extensions of content which should be pulled
        remote: 'origin' // what is the shorthand name of the remote repo, typically 'origin'
      }
    }
  ],
  serialisers: [
    {
      modulePath: '@jpmorganchase/mosaic-serialisers/html',
      filter: /\.html$/,
      options: {}
    }
  ],
  plugins: [
    {
      modulePath: '@jpmorganchase/mosaic-serialisers/html',
      options: {}
    }
  ]
});
