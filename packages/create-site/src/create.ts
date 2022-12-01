import { spawn } from 'child_process';
import nodePlop from 'node-plop';

const { default: inquirer } = await import('inquirer');

async function promptForGenerator(plop) {
  const allGenerators = plop.getGeneratorList();
  const { generator } = await inquirer.prompt([
    {
      type: 'list',
      name: 'generator',
      message: 'Please choose a generator',
      choices: allGenerators.map(({ description: defaultDescription, name }) => {
        const description = plop.getDescription(name);
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

function install() {
  return spawn('yarn', [], {
    cwd: process.cwd(),
    shell: true,
    stdio: 'inherit'
  });
}

type CreateMosaicAppEnv = {
  generators: (plop: [], env: Record<string, any>) => void[];
  config: Record<string, any>;
  defaultGenerator: string;
  force: boolean;
  interactive: boolean;
  outputPath: string;
};

export default async function createMosaicApp(env: CreateMosaicAppEnv): Promise<void> {
  const { config = {}, generators = [], interactive = false } = env;
  const plop = await nodePlop();
  await plop.load(generators, {
    destBasePath: env.outputPath,
    force: env.force
  });

  let generatorAnswer;
  if (interactive) {
    generatorAnswer = await promptForGenerator(plop);
  }
  const generatorName = generatorAnswer || env.defaultGenerator;
  const generator = plop.getGenerator(generatorName);

  let promptAnswers;
  if (generators?.prompts?.length) {
    promptAnswers = await generator.runPrompts();
  }
  const generatorConfig = {
    ...config[generatorName],
    answers: promptAnswers
  };
  generator.runActions(generatorConfig).then(results => {
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

  install().on('close', code => {
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
