import { pathsToModuleNameMapper } from 'ts-jest';
const { compilerOptions } = require('../../tsconfig.base.json');

// Separate from jest.config.ts (unit tests) on purpose: integration specs
// (`*.integration-spec.ts`) hit a real Postgres/Redis via
// apps/backend/test/integration-env.ts's globalSetup, so they must never be
// picked up by the fast, fully-mocked unit run (`pnpm run test:backend`) and
// vice versa — same split rationale as apps/frontend/vitest.config.ts uses
// between backend/jest and frontend/vitest.
export default {
  displayName: 'backend-integration',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  roots: ['<rootDir>/src', '<rootDir>/../../libraries'],
  testMatch: ['**/*.integration-spec.ts'],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/../../' }),
  globalSetup: '<rootDir>/test/integration-env.ts',
  // Real DB round-trips are slower than the mocked unit suite's default 5s.
  testTimeout: 30000,
};
