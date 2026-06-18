module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  testPathIgnorePatterns: ['\\.integration\\.spec\\.ts$'],
  transform: {
    // isolatedModules ici (et non dans tsconfig.json) : tsconfig.json sert aussi à `nest build`,
    // qui échoue avec TS1272 (emitDecoratorMetadata exige alors `import type` partout) si on
    // l'active globalement. ts-jest transpile-only n'a pas cette contrainte.
    '^.+\\.(t|j)s$': ['ts-jest', { isolatedModules: true }],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@sih-saas/shared$': '<rootDir>/../../../packages/shared/src/index.ts',
  },
};
