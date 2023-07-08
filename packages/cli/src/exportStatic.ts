import { spawn } from 'node:child_process';

function runCommand(command) {
  const child = spawn(command, {
    cwd: process.cwd(),
    shell: true
  });
  child.stdout.on('data', progress => console.log(progress.toString()));
  child.stderr.on('data', error => console.error(error.toString()));
  return child;
}

export default async function exportStatic() {
  try {
    const fsChild = runCommand(`yarn serve:fs`);
    const buildChild = runCommand(`yarn build:static`);
    buildChild.on('close', () => fsChild.kill());
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
