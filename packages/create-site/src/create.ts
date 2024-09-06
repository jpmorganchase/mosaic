import { spawn } from 'child_process';
import nodePlop from 'node-plop';
import { createRequire } from 'node:module';

const { default: inquirer } = await import('inquirer');

const nodeRequire = createRequire(import.meta.url);

async function promptForGenerator(plop, allGeneratorsConfig) {
  const allGenerators = plop.getGeneratorList();
  const { generator } = await inquirer.prompt([
    {
      type: 'list',
      name: 'generator',
      message: 'Please choose a generator',
      choices: allGenerators.map(({ name }) => {
        const description = allGeneratorsConfig[name].config.description;
        const choiceLabel = description ? `${name} - ${description}` : name;
        return {
          name: choiceLabel,
          value: name
        };
      })
    }
  ]);
  return generator;
}

function install(installPath) {
  return spawn('yarn', [], {
    cwd: installPath || process.cwd(),
    shell: true,
    stdio: 'inherit'
  });
}

type CreateMosaicAppEnv = {
  generators: Array<(plop: [], env: Record<string, any>) => void[]>;
  config: Record<string, any>;
  defaultGenerator: string;
  force: boolean;
  interactive: boolean;
  outputPath: string;
};

export default async function createMosaicApp(env: CreateMosaicAppEnv): Promise<void> {
  const { generators = [], interactive = false } = env;
  const generatorConfig = {};
  const plop = await nodePlop();

  await Promise.all(
    generators.map(async generator => {
      const { generatorName, ...generatorRest } = generator[1];
      const generatorPath = nodeRequire.resolve(generator[0]);
      generatorConfig[generatorName] = {
        plopFile: generatorPath,
        config: generatorRest
      };
      return import(generator[0]).then(generatorExports => {
        generatorExports.default(plop, {
          destBasePath: env.outputPath,
          force: env.force,
          generatorName
        });
      });
    })
  );

  let selectedGeneratorName = env.defaultGenerator;
  if (interactive) {
    selectedGeneratorName = await promptForGenerator(plop, generatorConfig);
  }
  const selectedGenerator = plop.getGenerator(selectedGeneratorName);
  plop.setPlopfilePath(generatorConfig[selectedGeneratorName].plopFile);
  let selectedGeneratorConfig = generatorConfig[selectedGeneratorName].config;
  if (interactive && selectedGenerator?.prompts?.length) {
    const promptAnswers = await selectedGenerator.runPrompts();
    selectedGeneratorConfig = {
      ...selectedGeneratorConfig,
      answers: promptAnswers
    };
  }
  await selectedGenerator.runActions(selectedGeneratorConfig).then(results => {
    const { changes, failures } = results;
    if (changes && changes.length) {
      changes.forEach(({ path }) => {
        console.info(path);
      });
    }
    if (failures && failures.length) {
      console.error('The following errors occurred:');
      failures.forEach(({ error }) => {
        console.error(error);
      });
    }
  });

  install(env.outputPath).on('close', code => {
    if (!code) {
      console.log('Success!');
      console.log('You can now serve your site');
      console.log('> yarn serve');
    } else {
      console.log('Failure!');
      console.log('Could not generate site');
    }
  });
}
