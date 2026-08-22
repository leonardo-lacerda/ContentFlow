import { defineConfig, devices } from '@playwright/test';

// Real-browser E2E harness. Run via `pnpm run test:e2e` (root package.json),
// which wraps this with `dotenv -e .env.test --` so DATABASE_URL/REDIS_URL/
// KIEAI_CHAT_BASE_URL/etc. are already in process.env by the time this file
// (and the webServer child processes below, which inherit process.env) load.
//
// `dev:backend`/`dev:frontend` each additionally run `dotenv -e ../../.env`
// internally, but dotenv-cli never overrides a variable already present in
// process.env (see apps/backend/test/reset-db.ts's PATCHED_ENV comment and
// scripts/start-local.mjs for the same convention already relied on
// elsewhere in this repo) - so the .env.test values set here always win over
// the repo's real .env, and no test config is duplicated in a second place.
//
// Requires a real Postgres on DATABASE_URL and Redis on REDIS_URL (see
// .env.test) to already be reachable - this config does not start them.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // specs share one Postgres/Redis; avoid cross-spec data races
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      // /auth/can-register is unauthenticated (AuthController) and returns
      // 200 as soon as Nest has finished bootstrapping - a genuine readiness
      // signal, unlike probing a random protected route that would 401.
      command: 'pnpm run dev:backend',
      url: 'http://localhost:3000/auth/can-register',
      cwd: __dirname,
      timeout: 180_000, // cold `nest start --watch` SWC compile is slow
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm run dev:frontend',
      url: 'http://localhost:4200',
      cwd: __dirname,
      timeout: 180_000, // cold `next dev` compile is slow
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      // Fake OpenAI-chat-completions + Kie.ai-shaped server backing
      // KIEAI_CHAT_BASE_URL / AI_GENERATE_BASE_URL in .env.test - see
      // apps/backend/test/fixtures/ai-provider-fake.ts for what it fakes and
      // why (proves the pipeline wiring, not generation quality).
      command: 'node --require ts-node/register/transpile-only apps/backend/test/fixtures/ai-provider-fake.ts',
      url: 'http://localhost:4400/healthz',
      cwd: __dirname,
      timeout: 30_000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
