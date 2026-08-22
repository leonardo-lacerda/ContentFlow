import { execFileSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

// Jest `globalSetup` — runs once, in a separate process, before any
// `*.integration-spec.ts` file. Pushes the current Prisma schema onto
// whatever Postgres `DATABASE_URL` (from .env.test, loaded by the
// `dotenv -e .env.test --` wrapper in the root `test:integration` script)
// points at, so specs always run against an up-to-date schema without a
// separate manual migration step. Uses `db push` (not `migrate deploy`) to
// match how local dev already provisions its database (see root
// package.json's `prisma-db-push` script) — this repo has no migrations
// directory, schema changes are pushed directly.
export default async function globalSetup() {
  const testDatabaseUrl = process.env.DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error(
      'DATABASE_URL is not set. Integration tests must run via `pnpm run test:integration` ' +
        '(which loads .env.test) — running `jest --config apps/backend/jest.integration.config.ts` ' +
        'directly will not have a database to connect to.'
    );
  }
  if (!/contentflow-db-test\b/.test(testDatabaseUrl)) {
    throw new Error(
      `DATABASE_URL ("${testDatabaseUrl}") doesn't look like the test database from .env.test ` +
        '(expected the "contentflow-db-test" database name). Refusing to run `prisma db push` ' +
        '+ table truncation against it — this could be a real database.'
    );
  }

  const repoRoot = path.resolve(__dirname, '../../..');
  const dotEnvPath = path.join(repoRoot, '.env');

  // Prisma 6's CLI loads dotenv with `override: true` against whatever `.env`
  // file sits at the repo root, which on a developer machine holds the real
  // dev DATABASE_URL — it would silently win over the test value already in
  // process.env. scripts/start-local.mjs hits this exact problem and works
  // around it by temporarily swapping the .env file contents; do the same
  // here rather than risk `db push` (and every integration spec's table
  // truncation) running against someone's real database.
  const hadDotEnv = existsSync(dotEnvPath);
  const originalDotEnv = hadDotEnv ? readFileSync(dotEnvPath, 'utf8') : null;

  try {
    if (hadDotEnv) {
      const patched = originalDotEnv!
        .replace(/^DATABASE_URL=.*/m, `DATABASE_URL="${testDatabaseUrl}"`)
        .replace(/^REDIS_URL=.*/m, `REDIS_URL="${process.env.REDIS_URL || ''}"`);
      writeFileSync(dotEnvPath, patched, 'utf8');
    }

    execFileSync(
      'pnpm',
      [
        'exec',
        'prisma',
        'db',
        'push',
        '--accept-data-loss',
        '--skip-generate',
        '--schema',
        './libraries/nestjs-libraries/src/database/prisma/schema.prisma',
      ],
      {
        cwd: repoRoot,
        env: process.env,
        stdio: 'inherit',
        shell: process.platform === 'win32',
      }
    );
  } finally {
    if (hadDotEnv && originalDotEnv !== null) {
      writeFileSync(dotEnvPath, originalDotEnv, 'utf8');
    }
  }
}
