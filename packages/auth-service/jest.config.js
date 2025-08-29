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
    '!src/__tests__/**',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
  projects: [
    {
      preset: 'ts-jest',
      testEnvironment: 'node',
      displayName: 'unit',
      testMatch: ['<rootDir>/src/__tests__/*-service.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/unit-setup.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
    },
    {
      preset: 'ts-jest',
      testEnvironment: 'node',
      displayName: 'integration',
      testMatch: ['<rootDir>/src/__tests__/*.integration.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration-setup.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
    }
  ]
};