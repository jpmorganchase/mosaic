/** Mosaic generator
 *
 * A Mosaic generator is a Plopfile (https://plopjs.com/) and generates a site from src/templates.
 * Refer to the Mosaic documentation for full details
 *
 */
function defaultGenerator(plop, env) {
  const { destBasePath, generatorName } = env;
  plop.setGenerator(generatorName, {
    description: 'Create a standard Mosaic site',
    actions: () => [
      {
        type: 'addMany',
        destination: destBasePath,
        base: 'templates',
        globOptions: [
          ['**/*'],
          {
            dot: true
          }
        ],
        templateFiles: ['templates/**/*', 'templates/.*']
      }
    ]
  });
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
}

function standardGenerator(plop, env) {
  defaultGenerator(plop, { generatorName: standardGenerator.generatorName, ...env });
}
standardGenerator.generatorName = 'mosaic';

module.exports = standardGenerator;
