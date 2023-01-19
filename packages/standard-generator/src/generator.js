/** Mosaic generator
 *
 * A Mosaic generator is a Plopfile (https://plopjs.com/) and generates a site from src/templates.
 * Refer to the Mosaic documentation for full details
 *
 */

const addNewSourcePrompt = () => ({
  type: 'confirm',
  name: 'addNewSource',
  message: 'Do you want to add Mosaic sources?',
  default: true
});

const sourceTypePrompt = () => ({
  type: 'list',
  name: 'sourceType',
  message: 'What type of source do you require?',
  choices: [
    { name: 'A remote repo such as BitBucket or Github', value: 'remote' },
    { name: 'A local directory', value: 'local' }
  ]
});

const localDirectoryPrompt = () => ({
  type: 'input',
  name: 'localPath',
  message: 'Which local directory do you want to use?',
  default: '../docs'
});

const remoteURLPrompt = () => ({
  type: 'input',
  name: 'remotePath',
  message: 'What is the url of the docs repo?',
  default: 'https://github.com/jpmorganchase/mosaic.git'
});

const remoteBranchPrompt = () => ({
  type: 'input',
  name: 'remoteBranch',
  message: 'What is the branch name you want to pull from?',
  default: 'main'
});

const namespacePrompt = (promptDefault = 'mosaic') => ({
  type: 'input',
  name: 'namespace',
  message: 'Which is the namespace for this source?',
  default: promptDefault
});

async function addSourcePrompts(inquirer) {
  const promptQueue = [];
  let sourcePaths = [];
  promptQueue.push(addNewSourcePrompt());
  let currentSource;
  while (promptQueue.length > 0) {
    const nextPrompt = promptQueue.shift();
    const nextAnswer = await inquirer.prompt(nextPrompt);
    if (Object.prototype.hasOwnProperty.call(nextAnswer, 'addNewSource')) {
      if (currentSource) {
        sourcePaths.push(currentSource);
        currentSource = undefined;
      }
      if (nextAnswer.addNewSource) {
        promptQueue.push(sourceTypePrompt());
      }
    }

    if (nextAnswer.sourceType === 'local') {
      promptQueue.push(namespacePrompt('local'));
      promptQueue.push(localDirectoryPrompt());
      promptQueue.push(addNewSourcePrompt());
    } else if (nextAnswer.sourceType === 'remote') {
      promptQueue.push(namespacePrompt('mosaic'));
      promptQueue.push(remoteURLPrompt());
      promptQueue.push(remoteBranchPrompt());
      promptQueue.push(addNewSourcePrompt());
    }

    if (nextAnswer.namespace) {
      currentSource = {
        ...currentSource,
        namespace: nextAnswer.namespace
      };
    } else if (nextAnswer.localPath) {
      currentSource = {
        ...currentSource,
        localPath: nextAnswer.localPath
      };
    } else if (nextAnswer.remotePath) {
      currentSource = {
        ...currentSource,
        remotePath: nextAnswer.remotePath
      };
    } else if (nextAnswer.remoteBranch) {
      currentSource = {
        ...currentSource,
        branch: nextAnswer.remoteBranch
      };
    }
  }
  return sourcePaths;
}

function standardGenerator(plop, env) {
  const { destBasePath, generatorName } = env;
  plop.setGenerator(generatorName, {
    description: env.description,
    actions: () => [
      {
        type: 'addMany',
        destination: destBasePath,
        base: 'templates',
        globOptions: {
          dot: true
        },
        templateFiles: ['templates/**/*', 'templates/.*']
      }
    ],
    prompts: async inquirer => addSourcePrompts(inquirer)
  });
  plop.setHelper('join', items => {
    const itemStrs = items.reduce(
      (result, item) => [
        ...result,
        JSON.stringify(item, null, 4)
          .replace(/"([^"]+)":/g, '$1:')
          .replace(/"/g, "'")
      ],
      []
    );
    return itemStrs.join(',\n').replace(/^/, '    ').replace(/\n/g, '\n    ');
  });
  plop.setHelper('isNotLastItem', (items, currentIndex) => currentIndex < items.length - 1);
  plop.setHelper('printDependencies', dependencies =>
    dependencies.map(({ package: pkg, version }) => `    "${pkg}": "${version}",`).join('\n')
  );
  plop.setHelper('printComponentIdentifiers', imports => {
    const identifiers = imports.reduce(
      (result, { identifier, type }) => (type === 'component' ? [...result, identifier] : result),
      []
    );
    if (identifiers.length === 1) {
      return identifiers[0];
    }
    return `{ ${identifiers.map(identifier => `...${identifier}`).join(',')} }`;
  });
  plop.setHelper('printLayoutIdentifiers', imports => {
    const identifiers = imports.reduce(
      (result, { identifier, type }) => (type === 'layout' ? [...result, identifier] : result),
      []
    );
    if (identifiers.length === 1) {
      return identifiers[0];
    }
    return `{ ${identifiers.map(identifier => `...${identifier}`).join(',')} }`;
  });
  plop.setHelper('printImports', imports =>
    imports.map(({ import: importedDependency }) => importedDependency).join('\n')
  );
  plop.setHelper('printNamespaceRedirects', sources => {
    const redirects = sources.reduce((accum, { namespace }, index) => {
      let result =
        index === 0
          ? [
              ...accum,
              {
                source: '/',
                destination: `/${namespace}/index`,
                permanent: true
              }
            ]
          : [...accum];
      result = [
        ...result,
        {
          source: `/${namespace}`,
          destination: `/${namespace}/index`,
          permanent: true
        }
      ];
      return result;
    }, []);
    return JSON.stringify(redirects, null, 2)
      .replace(/[\n]/g, '\n    ')
      .replace(/"([^"]+)":/g, '$1:')
      .replace(/"/g, "'");
  });
}

const generatorModule = (module.exports = standardGenerator);
generatorModule.addSourcePrompts = addSourcePrompts;
