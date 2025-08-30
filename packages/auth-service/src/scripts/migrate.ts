#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { connectDatabase, getPool } from '../database/connection';
import { MigrationRunner } from '../database/migration-runner';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');
    
    // Connect to database
    await connectDatabase();
    const pool = getPool();
    
    // Run migrations
    const migrationRunner = new MigrationRunner(pool);
    await migrationRunner.runMigrations();
    
    logger.info('✅ All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();