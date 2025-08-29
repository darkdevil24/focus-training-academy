import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';

// Mock console methods to reduce noise in unit tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};