'use strict';
const chalk = require('chalk');
const { execSync } = require('child_process');

const log = {
  error: message => console.log(chalk.red(`ERROR : `), message),
  progress: message => console.log(chalk.green(message))
};

const packageVersion = process.argv[2]; // this is passed in from the root package (until we are doing package bumps)
const tagnameCurrent = 'current';
const tagnamePrevious = 'previous';
/**
 * Generate TypeDoc documentation
 */
function generateDocs() {
  try {
    const cmd = `git rm -r docs && typedoc --plugin none --tsconfig ./tsconfig.json ./src/*/index.tsx --out ./docs/${packageVersion}`;
    execSync(cmd, { stdio: 'inherit' });
    log.progress(`Generate TypeDoc pages`);
  } catch (error) {
    log.error(`Could not generate TypeDoc pages`);
    log.error(error.message);
    process.exit(1);
  }
}

/** Commit generated docs */
function commit() {
  try {
    const commitMessage = `docs: automated TypeDoc publication (UIE-6565)`;
    let cmd = `git add docs/${packageVersion} ':!docs/${packageVersion}/assets' -f && git commit -m '${commitMessage}'`;
    execSync(cmd, { stdio: 'inherit' });
    log.progress(`Commit TypeDoc pages`);
  } catch (error) {
    log.error(`Could not commit TypeDoc pages`);
    log.error(error.message);
    process.exit(1);
  }
}

/** Update or Create previous/current tags */
function createTags() {
  try {
    let cmd, stdout;
    // get the last release commit SHA for use in 'previous' tag
    cmd = `git rev-list -n 1 current`;
    stdout = execSync(cmd).toString();
    const previousReleaseSHA = stdout.trim();

    // get the last release commit annotation for use in'previous' tag
    cmd = `git for-each-ref refs/tags/${tagnameCurrent} --format='%(contents)'`;
    stdout = execSync(cmd).toString();
    const previousReleaseAnnotation = stdout.trim();

    // delete and create new previous tag
    cmd = `git tag -d ${tagnamePrevious} && git tag -a ${tagnamePrevious} ${previousReleaseSHA} -m "${previousReleaseAnnotation}"`;
    execSync(cmd, { stdio: 'inherit' });

    // delete and create new current tag
    cmd = `git tag -d ${tagnameCurrent} && git tag -a ${tagnameCurrent} -m "Release ${packageVersion}"`;
    execSync(cmd, { stdio: 'inherit' });
    log.progress(`Tag branch`);
  } catch (error) {
    log.error(`Could not tag branch`);
    log.error(error.message);
    process.exit(1);
  }
}

function logTags() {
  try {
    let cmd, stdout;
    // get the last release commit SHA for use in 'previous' tag
    cmd = `git tag -l  ${tagnamePrevious} -n`;
    stdout = execSync(cmd).toString();
    log.progress(`${tagnamePrevious} tag = ${stdout.trim()}`);
    cmd = `git tag -l  ${tagnameCurrent} -n`;
    stdout = execSync(cmd).toString();
    log.progress(`${tagnameCurrent} tag = ${stdout.trim()}`);
  } catch (error) {
    log.error(`Could not log tags`);
    log.error(error.message);
    process.exit(1);
  }
}

generateDocs();
commit();
createTags();
logTags();
