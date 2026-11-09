import { existsSync, readFileSync } from 'node:fs';

if (existsSync('.changeset/upgrade-zod-v4.md')) {
  const { version } = JSON.parse(readFileSync('packages/schemas/package.json', 'utf8'));

  // From x.0.0 prereleases, Changesets can keep a major bump on the same
  // release line. Existing Zod 3 consumers could then resolve Zod 4 schemas.
  if (/^\d+\.0\.0-/.test(version)) {
    throw new Error(
      `The Zod 4 migration needs a new major release line. Changesets can keep a major bump from ${version} on the same line.`
    );
  }
}
