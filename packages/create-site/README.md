# Mosaic Create Site

`@jpmorganchase/mosaic-create-site` is a CLI script which scaffolds your very own Mosaic site from pre-defined generators.

## Installation

`yarn add webpack -D @jpmorganchase/mosaic-create-site`

## Basic Commands

### `yarn mosaic-create-site init`

Running `init` will create a basic `mosaic.generators.js` in your current directory, this is an optional file, which enables
you to add configurations to generators.

For instance, generators do not need to define any sources, additional sources can be added via `mosaic.generators.js`.

To add a source such as Github/BitBucket the contents might look like this.
This particular config would create a package called `@jpmorganchase/mosaic-demo` and load the Mosaic tech docs into `demo` namespace.

```
    [
      '@jpmorganchase/mosaic-standard-generator/dist/generator.js',
      {
        ...standardGeneratorConfig,
        generatorName: 'demo',
        name: '@jpmorganchase/mosaic-demo',
        namespace: 'demo',
        description: "Mosaic Development Rig",
        homepage: '/demo',
        sources: [
          {
            modulePath: require.resolve('@jpmorganchase/mosaic-source-git-repo'),
            namespace: 'demo', // each site has it's own namespace, think of this as your content's uid
            options: {
              // To run locally, enter your credentials to access the BitBucket repo
              // !! Polite Reminder... do not store credentials in code !!
              // For final deployments, you could put repo access credentials securely in environment variables provided by Gaia console.
              // credentials: "{process.env.FID}:{process.env.FID_PERSONAL_ACCESS_TOKEN}",
              // If running locally
              // create an environment variable like MOSAIC_DOCS_CLONE_CREDENTIALS to let the user define it via the CLI
              // export MOSAIC_DOCS_CLONE_CREDENTIALS="<sid>:<Personal Access Token (PAT) provided by your Repo OR password>",
              credentials: process.env.MOSAIC_DOCS_CLONE_CREDENTIALS,
              prefixDir: 'demo',
              subfolder: 'docs', // subfolder within your branch containing the docs, typically 'docs'
              repo: 'github.com/jpmorganchase/mosaic.git', // repo url without any protocol
              branch: 'main', // branch where docs are pulled from
              extensions: ['.mdx'], // extensions of content which should be pulled
              remote: 'origin' // what is the shorthand name of the remote repo, typically 'origin'
            }
          }
        ]
      }
    ]
```

### `yarn mosaic-create-site create`

Once you have created your `mosaic.generators.js`, we can think about configuring your first Mosaic site.

Running `create` will generate a Mosaic site from the configured templates.
Lets see what this looks like by running the script with the `--interactive (-i)` and the `--output (-o)` flags.

`yarn mosaic-create-site create --interactive --ouput <path to your output directory>`

You should see a menu appear giving you a list of the available Mosaic templates.

Select `mosaic - Create a standard Mosaic site` and a standard Mosaic site should be generated in the specified output directory.
You will be asked which sources you would like to add `local` (pre-cloned docs) or a remote docs repo.

A standard Mosaic template creates a site, pre-configured with the Mosaic components, layout and theme.

#### Configuration

If you don't want to run in interactive mode, you could use the CLI arguments instead.

| Argument                                   | Short form | Required | Description                                               |
| ------------------------------------------ | ---------- | -------- | --------------------------------------------------------- |
| `--config <path to your mosaic config>`    | -i         | No       | Defines the path to your mosaic config file.              |
| `--generator <name of generator to run>`   | -g         | No       | Name of generator to run (if not interactive).            |
| `--help`                                   | -h         | No       | Usage info                                                |
| `--interactive`                            | -i         | No       | Interactive mode                                          |
| `--output <path to your output directory>` | -o         | Yes      | Defines the output directory where the site is generated. |
| `--force`                                  | -f         | No       | Force overwrite of existing files during site generation  |

#### How It Works

Running `create` will scaffold a Mosaic site, combining published templates with local config.
To do this, we employ a config file (`mosaic.generators.js`) which specifies [Plop JS](http://plopjs) generators and
related config.

By editing `mosaic.generators.js`, you can extend the Mosaic design language, adding your own components, layouts or theme packages.

The generated content from `create` consists of a Mosaic site with no content. Mosaic is created using [NextJS](https://nextjs.org/).
The Mosaic templates create a Next JS application containing a `_app.tsx` file that serves as an escape hatch to configure your site, with
extended layout, components or theme.

If you decide to modify `_app.tsx` or `package.json` by hand, be advised that re-running `create` may overwrite those changes.  
Instead review the templates that `mosaic-create-site` provides and consider creating your own templates.

### Configuration

Your `mosaic.generators.js` config defines the `dependencies` created in your `package.json` and `imports` used by your Next JS `_app.tsx`.
These are available within templates as variables, which can be referenced inside your templates using the Mustache notation.

```
{{{ someVariableFromYourMosaicConfig }}}
```

The following variables are required by Mosaic generators.

#### `dependencies`

Dependencies defines and array of dependencies which will be added to your `package.json`

```
{
   package: <package name>,
   version: <package version>
}
```

#### `imports`

Imports defined how we import the `package.json` dependencies in Next JS `_app.tsx`file;

```
{
   import: <import statement for dependency>
   identifier: <import identifier that the import statement uses>
   type: [component|layout|undefined]
}
```

### Helper functions

A number of helper functions are available for use in templates. They are functions, which act as formatters for template variables.

#### `printDependencies`

`printDependencies` will format the config entries for `dependencies` in a suitable form for the `package.json`.

```
  "dependencies": {
{{{ printDependencies dependencies }}}
  },
```

would generate

```
"dependencies": {
  "@jpmorganchase/components": "^1.0.0",
  "@jpmorganchase/layouts": "^1.0.0",
  "@jpmorganchase/plugin-content-editor": "^1.0.0",
  "@jpmorganchase/site-components": "^1.0.0",
  "@jpmorganchase/site-store": "^1.0.0"
},
```

#### `printImports`

`printImports` will format the config entries for `imports` in a suitable form for the `_app.ts`.

```
{{{ printImports imports }}}
```

would generate something like (based at time of writing on the current Mosaic imports)

```
import { BaseUrlProvider, Image, Link, Metadata, SessionProvider } from '@jpmorganchase/site-components';
import { ImageProvider, LinkProvider, ThemeProvider } from '@jpmorganchase/components';
import { LayoutProvider } from '@jpmorganchase/site-layout';
import { useCreateStore, StoreProvider } from '@jpmorganchase/site-store';
import mosaicComponents from '@jpmorganchase/components';
import { layouts as mosaicLayouts } from '@jpmorganchase/layouts';
import '@jpmorganchase/site-preset-styles/dist/index.css';
```

#### `printLayoutIdentifiers`

`printLayoutIdentifiers` will format the layout identifers used in `_app.tsx`;

```
const layoutComponents = {{{ printLayoutIdentifiers imports }}};
```

would generate something like (based at time of writing on the current Mosaic imports)

```
const layoutComponents = [ ...mosaicLayouts ];
```

#### `printComponentIdentifiers`

`printComponentIdentifiers` will format the component identifers used in `_app.tsx`;

```
const components = {{{ printComponentIdentifiers imports }}};
```

would generate something like (based at time of writing on the current Mosaic imports)

```
const components = [ ...mosaicComponents ];
```

#### `join`

`join` is used to construct a list of comma seperated values.

```
  "sources": [
{{{ join sources }}}
  ],
```

## How to add your own Component, Layouts or Theme CSS

If you wish to add your own components or layouts, you simply need to add your own additional packages to the `imports` array,
of the related template.

Inside `mosaic.generators.js` combine together the standard settings from the Mosaic package with your own imports using `getConfig`.
Alternatively, you can 'roll your own' solution, although this creates the added responsibility of keeping them in sync with Mosaic.

```
import { getConfig } from '@jpmorganchase/mosaic-create-site';

const myMosaicAdditions = {
   mosaic: {
      imports: [
         {
            import: `import myComponents from '@my-components-package';`,
            identifier: 'myComponents',
            type: 'component'
         },
         {
            import: `import myLayouts from '@my-layout-package';`,
            identifier: 'myLayouts',
            type: 'layout'
         }
         {
            import: "import '@my-style-package/dist/index.css';",
         }
      ]
   }
};
const myExtendedConfig = getConfig(myMosaicAdditions);
module.exports = myExtendedConfig;
```

The `component` and `layout` imports should have a `type` defined so Mosaic can attach the import `identifier` to the correct
Provider in `_app.tsx`.

Note: Components and Layout packages must share the same React/UITK versions as Mosaic.

## How to update Mosaic

To update Mosaic, you can choose to just pip the Mosaic dependencies inside your site's generated `package.json`.
After re-running `yarn` this will re-use the existing site configuration from `mosaic.generators.js` with the latest Mosaic dependencies.

Occasionally you might want to re-generate your site or switch templates.
For this, you will need to pip the version of `@jpmorganchase/mosaic-create-site` to the latest version and re-run
`create` with a `--force (-f)` flag to overwrite the existing site.

`yarn mosaic create <-o path to your output directory> -g <generator name> -f`

Aside from updating the standard config, the under-lying Mosaic dependencies for components, theme and layouts will also be updated.

Once you have updated your Mosaic site, rerun` yarn serve` to serve.

For the advanced use-case, where you want complete control of the configuration and decide to fork `_app.tsx`, you will
need to manage updates yourself. A migration guide and potentially codemods will exist to support migration by hand.

### Create your own templates

To convert any file into a template, just add a `.hbs` suffix to your file.

Refer to the [Mustache docs](https://github.com/janl/mustache.js#variables) for further info.

Once you have created a set of templates, you would need to create a [Plop JS](http://plopjs) generator which uses these templates and add that  
generator to your `mosaic.generators.js`.

You can specify the generator path as either a NPM/Artifactory package or a local path.

```
  import createMosaicApp from '@jpmorganchase/mosaic-create-site/dist/create.mjs';
  import { getConfig } from '@jpmorganchase/mosaic-create-site';
  import myGenerator from '@my-generator-package';
  const env = {
    generators: [ myGenerator ], // array of generators which are plopjs files
    config: getConfig(), // config object for configured generators
    defaultGenerator: 'mosaic', // name of the defaultGenerator, useful when you use the `interactive` flag is true
    force: false, // if true, overwrite existing files (default: false)
    interactive: true, // run in interactive mode (default: false)
    outputPath: './site' // path to your the target directory
  };
  createMosaicApp({

});
```

A power feature of [Plop JS](http://plopjs) is the ability to add [`prompts`](https://plopjs.com/documentation/#using-prompts) to your config that use
[Inquirer](https://github.com/SBoudrias/Inquirer.js#inquirerjs) and [Inquirer plugins](https://github.com/SBoudrias/Inquirer.js/#plugins).
