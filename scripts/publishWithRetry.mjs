import { spawn } from 'node:child_process';

// npm's OIDC trusted-publishing token exchange is performed per-package by
// Yarn, and `changeset publish` runs several of these concurrently. Under
// that concurrency the exchange occasionally fails (rate limiting/transient
// network errors), which Yarn surfaces as a generic
// `YN0033: No authentication configured for request` rather than a
// retryable error. Retrying is safe: packages already published to the
// registry are detected by `changeset publish` and skipped, and
// `CHANGESETS_OUTPUT` (read by `changesets/action` to create GitHub
// releases/tags) is appended to rather than overwritten, so successful
// publishes from earlier attempts are not lost on a later retry.
//
// Any extra arguments are forwarded to `changeset publish`, e.g.
// `node ./scripts/publishWithRetry.mjs --tag snapshot --no-git-tag`.
const maxAttempts = 3;
const publishArgs = process.argv.slice(2);

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => resolve(code ?? 1));
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  const exitCode = await run('yarn', ['changeset', 'publish', ...publishArgs]);

  if (exitCode === 0) {
    process.exit(0);
  }

  if (attempt === maxAttempts) {
    console.error(
      `yarn changeset publish failed after ${maxAttempts} attempts (exit code ${exitCode}).`
    );
    process.exit(exitCode);
  }

  console.warn(
    `yarn changeset publish failed (attempt ${attempt}/${maxAttempts}, exit code ${exitCode}), retrying...`
  );
  await sleep(attempt * 10_000);
}
