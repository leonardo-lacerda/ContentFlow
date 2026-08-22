import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

/**
 * Truncates every table in the test database's `public` schema, cascading
 * through foreign keys, and resets identity sequences. Call this in
 * `beforeEach` (not `beforeAll`) in every `*.integration-spec.ts` file that
 * writes data, so tests in the same file can't leak state into each other —
 * integration specs run `--runInBand` (apps/backend/jest.integration.config.ts)
 * so there's no cross-file parallelism to worry about, only cross-test.
 *
 * Deliberately truncates rather than dropping/recreating the schema: the
 * schema itself is pushed once per whole run by
 * apps/backend/test/integration-env.ts's globalSetup, and re-pushing it per
 * test would be far slower for no benefit.
 */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;

  if (tables.length === 0) return;

  const quoted = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE;`);
}

let sharedPrisma: PrismaService | null = null;

/**
 * Shared PrismaService instance for integration specs that don't need a full
 * Nest module (most don't — they only need real rows to set up fixtures and
 * assert on afterward). Specs that exercise a controller via supertest still
 * pull their own PrismaService out of the Nest testing module so the code
 * under test and the assertions go through the exact same connection.
 */
export function getTestPrisma(): PrismaService {
  if (!sharedPrisma) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL is not set — run integration specs via `pnpm run test:integration` (loads .env.test).'
      );
    }
    // Deliberately pass `datasourceUrl` explicitly rather than `new PrismaService()`
    // (which relies on Prisma's own env resolution): Prisma 6's CLI/client dotenv
    // loading uses `override: true` against whatever `.env` file sits at the repo
    // root, which on a developer machine is the *real* dev database — the same
    // footgun scripts/start-local.mjs already documents and works around by
    // swapping the .env file. Since resetDatabase() below TRUNCATEs every table,
    // silently resolving to the wrong database here would be actively destructive,
    // not just wrong — so this bypasses .env resolution entirely instead of
    // relying on file-swapping tricks for the test process itself.
    sharedPrisma = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL,
    }) as unknown as PrismaService;
  }
  return sharedPrisma;
}

afterAll(async () => {
  if (sharedPrisma) {
    await sharedPrisma.$disconnect();
    sharedPrisma = null;
  }
});
