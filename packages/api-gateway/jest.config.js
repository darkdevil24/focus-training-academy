module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: [],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@focus-academy/shared$': '<rootDir>/../shared/src/index.ts',
  },
  modulePaths: ['<rootDir>/src', '<rootDir>/../shared/src'],
  testTimeout: 10000,
}