// Tests nécessitant les conteneurs de dev réels (Postgres + MongoDB) : pnpm docker:dev:up au préalable.
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '\\.integration\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  testTimeout: 30000,
  moduleNameMapper: {
    '^@sih-saas/shared$': '<rootDir>/../../../packages/shared/src/index.ts',
  },
};
