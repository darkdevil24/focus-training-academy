module.exports = {
  projects: [
    {
      displayName: 'shared',
      testMatch: ['<rootDir>/packages/shared/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      collectCoverageFrom: [
        'packages/shared/src/**/*.ts',
        '!packages/shared/src/**/*.d.ts',
      ],
    },
    {
      displayName: 'api-gateway',
      testMatch: ['<rootDir>/packages/api-gateway/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      collectCoverageFrom: [
        'packages/api-gateway/src/**/*.ts',
        '!packages/api-gateway/src/**/*.d.ts',
      ],
    },
    {
      displayName: 'auth-service',
      testMatch: ['<rootDir>/packages/auth-service/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      collectCoverageFrom: [
        'packages/auth-service/src/**/*.ts',
        '!packages/auth-service/src/**/*.d.ts',
      ],
    },
    {
      displayName: 'frontend',
      testMatch: ['<rootDir>/packages/frontend/**/*.test.{ts,tsx}'],
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/packages/frontend/src/test/setup.ts'],
      collectCoverageFrom: [
        'packages/frontend/src/**/*.{ts,tsx}',
        '!packages/frontend/src/**/*.d.ts',
        '!packages/frontend/src/test/**/*',
      ],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/packages/frontend/src/$1',
      },
    },
  ],
  collectCoverageFrom: [
    'packages/*/src/**/*.{ts,tsx}',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/test/**/*',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
};