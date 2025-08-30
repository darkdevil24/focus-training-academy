#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { connectDatabase, getPool } from '../database/connection';
import { MigrationRunner } from '../database/migration-runner';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

async function rollbackMigration() {
  try {
    const migrationName = process.argv[2];
    
    if (!migrationName) {
      logger.error('Please provide migration name to rollback');
      logger.info('Usage: npm run migrate:rollback <migration-filename>');
      process.exit(1);
    }
    
    logger.info(`Rolling back migration: ${migrationName}`);
    
    // Connect to database
    await connectDatabase();
    const pool = getPool();
    
    // Rollback migration
    const migrationRunner = new MigrationRunner(pool);
    await migrationRunner.rollbackMigration(migrationName);
    
    logger.info('✅ Migration rollback completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Rollback failed:', error);
    process.exit(1);
  }
}

rollbackMigration();