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
    // @copilotkit/react-ui pulls in several Radix UI packages that ship as
    // ESM-only. Left external, Vite's CJS/ESM interop shim fails to detect
    // their named exports ("does not provide an export named ..."), even
    // though the packages are valid ESM - inlining them makes Vite actually
    // transform/bundle them instead of guessing at their export shape.
    server: {
      deps: {
        inline: [/@radix-ui\//, /@copilotkit\//],
      },
    },
    // Off by default (the plain `test`/`test:watch` scripts pass
    // --no-coverage for fast local iteration); enabled via the root
    // `pnpm run test:coverage` script. Thresholds are set once a real
    // baseline is measured — see TESTING.md.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: '../../coverage/apps/frontend',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.spec.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    },
  },
});
