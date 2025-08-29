#!/usr/bin/env tsx

import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { createLogger } from '../utils/logger'

const logger = createLogger('create-migration-script')

async function createMigration() {
  const migrationName = process.argv[2]
  
  if (!migrationName) {
    logger.error('Migration name is required')
    logger.info('Usage: npm run db:migration:create <migration_name>')
    process.exit(1)
  }
  
  try {
    // Generate timestamp
    const now = new Date()
    const timestamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      '_',
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0')
    ].join('')
    
    const filename = `${timestamp}_${migrationName.replace(/\s+/g, '_').toLowerCase()}`
    const migrationsDir = join(__dirname, '../database/migrations/sql')
    
    // Ensure migrations directory exists
    await mkdir(migrationsDir, { recursive: true })
    
    // Create migration file
    const migrationPath = join(migrationsDir, `${filename}.sql`)
    const migrationTemplate = `-- ${migrationName}
-- Add your migration SQL here

-- Example:
-- CREATE TABLE example_table (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     name VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- CREATE INDEX idx_example_table_name ON example_table(name);

-- COMMENT ON TABLE example_table IS 'Description of the table purpose';
`
    
    await writeFile(migrationPath, migrationTemplate)
    logger.info(`Created migration file: ${filename}.sql`)
    
    // Create rollback file
    const rollbackPath = join(migrationsDir, `${filename}.rollback.sql`)
    const rollbackTemplate = `-- Rollback for ${migrationName}
-- Add your rollback SQL here

-- Example:
-- DROP INDEX IF EXISTS idx_example_table_name;
-- DROP TABLE IF EXISTS example_table;
`
    
    await writeFile(rollbackPath, rollbackTemplate)
    logger.info(`Created rollback file: ${filename}.rollback.sql`)
    
    logger.info('Migration files created successfully!')
    logger.info(`Edit the files and run 'npm run db:migrate' to apply the migration`)
    
  } catch (error) {
    logger.error('Failed to create migration:', error)
    process.exit(1)
  }
}

createMigration().catch(error => {
  logger.error('Unhandled error:', error)
  process.exit(1)
})