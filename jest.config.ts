// `@nx/jest` (and the Nx project graph it relies on for `getJestProjects`)
// isn't installed in this repo, so the project list is declared explicitly.
export default {
  projects: ['<rootDir>/apps/backend/jest.config.ts'],
};
