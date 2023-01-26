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
  sources: [
    /**
     * Demonstrates a local file-system source, in this case a relative path to where the
     * site was generated.
     * Access from your browser as http://localhost:3000/local
     */
    /**
     * Demonstrates a remote source, in this case the Mosaic site
     * Access from your browser as http://localhost:3000/mosaic
     */
    // {
    //   modulePath: '@jpmorganchase/mosaic-source-git-repo',
    //   namespace: 'mosaic', // each site has it's own namespace, think of this as your content's uid
    //   options: {
    //     // To run locally, enter your credentials to access the Git repo
    //     // e.g create the environment variable MOSAIC_DOCS_CLONE_CREDENTIALS
    //     // !! Polite Reminder... do not store credentials in code !!
    //     // For final deployments: you could put repo access credentials securely in environment variables provided by your host.
    //     // If running locally: create the environment variable MOSAIC_DOCS_CLONE_CREDENTIALS
    //     // export MOSAIC_DOCS_CLONE_CREDENTIALS="<repo username>:<Personal Access Token (PAT) provided by your Repo OR password>",
    //     credentials: process.env.MOSAIC_DOCS_CLONE_CREDENTIALS,
    //     prefixDir: 'mosaic', // root path used for namespace
    //     cache: true,
    //     subfolder: 'docs', // subfolder within your branch containing the docs, typically 'docs'
    //     repo: 'github.com/jpmorganchase/mosaic.git', // repo url without any protocol
    //     branch: 'sourceTypedocs', // branch where docs are pulled from
    //     extensions: ['.mdx'], // extensions of content which should be pulled
    //     remote: 'origin' // what is the shorthand name of the remote repo, typically 'origin'
    //   }
    // },
    /**
     * Demonstrates a local file-system source, in this case a relative path to where the
     * site was generated.
     * Access from your browser as http://localhost:3000/local
     */
    {
      modulePath: '@jpmorganchase/mosaic-source-local-folder',
      namespace: 'local', // each site has it's own namespace, think of this as your content's uid
      options: {
        rootDir: '../../docs', // relative path to content
        prefixDir: 'local', // root path used for namespace
        extensions: ['.mdx'] // extensions of content which should be pulled
      }
    }
  ]
});
