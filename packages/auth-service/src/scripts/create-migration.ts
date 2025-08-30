#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

function createMigration() {
  const migrationName = process.argv[2];
  
  if (!migrationName) {
    logger.error('Please provide migration name');
    logger.info('Usage: npm run migrate:create <migration-name>');
    logger.info('Example: npm run migrate:create add_user_preferences_table');
    process.exit(1);
  }
  
  // Generate timestamp
  const timestamp = new Date().toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+/, '')
    .replace('T', '_');
  
  const filename = `${timestamp}_${migrationName}.sql`;
  const migrationsDir = path.join(__dirname, '..', 'database', 'migrations', 'sql');
  const filePath = path.join(migrationsDir, filename);
  
  // Ensure migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }
  
  // Create migration template
  const template = `-- Migration: ${migrationName}
-- Created: ${new Date().toISOString()}

-- Add your migration SQL here
-- Example:
-- CREATE TABLE example_table (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP DEFAULT NOW(),
--   updated_at TIMESTAMP DEFAULT NOW()
-- );

-- CREATE INDEX IF NOT EXISTS idx_example_table_name ON example_table(name);
`;
  
  fs.writeFileSync(filePath, template);
  
  logger.info(`✅ Migration created: ${filename}`);
  logger.info(`📁 Location: ${filePath}`);
  logger.info('📝 Edit the file to add your migration SQL');
  logger.info('🚀 Run migration: npm run migrate');
}

createMigration();