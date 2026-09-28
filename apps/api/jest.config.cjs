module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src/modules'],
  testMatch: ['**/*.spec.ts'],
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }] },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/modules/**/*.service.ts'],
};

