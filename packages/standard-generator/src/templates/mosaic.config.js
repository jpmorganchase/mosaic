const path = require('path');
const deepmerge = require('deepmerge');
const mosaicConfig = require('@dpmosaic/mosaic-standard-generator/dist/fs.config.js');

/** Enhance/modify your Mosaic core fs
 * pageExtensions: supported file extensions which can be stored in the Virtual File System (VFS) created by Core FS
 * ignorePages: list of files which will be ignored from pulled content,
 * serialisers: define serialisers and deserialisers for the supported file extensions
 * plugins: <...plugin definitions>
 * sources: <...source definitions>
 */
module.exports = deepmerge(mosaicConfig, {
  sources: [
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-source-local-folder'),
      namespace: 'local',
      options: {
        rootDir: path.join(process.env.INIT_CWD, 'INSERT RELATIVE PATH', 'docs'),
        cache: true,
        prefixDir: 'mosaic',
        extensions: ['.mdx']
      }
    },
    {
      modulePath: require.resolve('@jpmorganchase/mosaic-source-bitbucket'),
      namespace: 'mosaic', // each site has it's own namespace, think of this as your content's uid
      options: {
        // To run locally, enter your credentials to access the BitBucket repo
        // !! Polite Reminder... do not store credentials in code !!
        // For final deployments, you could put repo access credentials securely in environment variables provided by Gaia console.
        // credentials: "{process.env.FID}:{process.env.FID_PERSONAL_ACCESS_TOKEN}",
        // If running locally
        // create an environment variable like BITBUCKET_CLONE_CREDENTIALS to let the user define it via the CLI
        // export BITBUCKET_CLONE_CREDENTIALS="<sid>:<Personal Access Token (PAT) provided by your Repo OR password>",
        credentials: process.env.BITBUCKET_CLONE_CREDENTIALS,
        // Add to use a folder prefix
        // prefixDir: 'cibdat',
        subfolder: 'docs', // subfolder within your branch containing the docs, typically 'docs'
        repo: 'INSERT REPO URL', // repo url without any protocol
        branch: 'INSERT BRANCH NAME', // branch where docs are pulled from
        extensions: ['.mdx'], // extensions of content which should be pulled
        remote: 'origin' // what is the shorthand name of the remote repo, typically 'origin'
      }
    }
  ]
});
