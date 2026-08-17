import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Frontend test runner (vitest). Kept deliberately separate from the backend's
// jest config: the backend/libraries suite runs under jest (node env), while the
// frontend's artifact-rendering pipeline — the most-changed, most-regression-prone
// code in the Studio — runs here under jsdom so its parsers, dedup logic and React
// cards can finally be covered by automated tests. Wired into `pnpm test` via the
// root `test` script so CI runs it on every push.
const repoRoot = resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@gitroom/backend': resolve(repoRoot, 'apps/backend/src'),
      '@gitroom/frontend': resolve(repoRoot, 'apps/frontend/src'),
      '@gitroom/helpers': resolve(repoRoot, 'libraries/helpers/src'),
      '@gitroom/nestjs-libraries': resolve(
        repoRoot,
        'libraries/nestjs-libraries/src'
      ),
      '@gitroom/react': resolve(repoRoot, 'libraries/react-shared-libraries/src'),
      '@gitroom/plugins': resolve(repoRoot, 'libraries/plugins/src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    // Keep the frontend suite hermetic: no dependency on a real .env, DB or the
    // backend. Component tests mock the network at the module boundary.
    clearMocks: true,
    restoreMocks: true,
    setupFiles: [resolve(__dirname, 'vitest.setup.ts')],
  },
});
