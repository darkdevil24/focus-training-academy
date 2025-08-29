import dotenv from 'dotenv';
import { connectDatabase } from '../database/connection';
import { MigrationRunner } from '../database/migration-runner';
import { getPool } from '../database/connection';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DB_NAME = 'focus_academy_test';
process.env.REDIS_DB = '1'; // Use different Redis database for tests

beforeAll(async () => {
  try {
    // Connect to test database
    await connectDatabase();
    
    // Run migrations
    const pool = getPool();
    const migrationRunner = new MigrationRunner(pool);
    await migrationRunner.runMigrations();
    
    console.log('Test database setup complete');
  } catch (error) {
    console.error('Test setup failed:', error);
    throw error;
  }
});

afterAll(async () => {
  try {
    const pool = getPool();
    await pool.end();
  } catch (error) {
    console.error('Test cleanup failed:', error);
  }
});