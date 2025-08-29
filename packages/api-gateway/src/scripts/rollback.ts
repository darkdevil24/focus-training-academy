#!/usr/bin/env tsx

import { config } from 'dotenv'
import { MigrationRunner } from '../database/migrations/migration-runner'
import { initializeDatabase, createDatabaseConfig } from '../database/connection'
import { createLogger } from '../utils/logger'

// Load environment variables
config()

const logger = createLogger('rollback-script')

async function rollbackMigration() {
  try {
    logger.info('Starting migration rollback...')
    
    // Initialize database connection
    const dbConfig = createDatabaseConfig()
    const db = initializeDatabase(dbConfig)
    await db.connect()
    
    // Rollback last migration
    const migrationRunner = new MigrationRunner()
    await migrationRunner.rollbackLastMigration()
    
    logger.info('Migration rollback completed successfully')
    
    // Get updated migration status
    const status = await migrationRunner.getMigrationStatus()
    logger.info(`Database status: ${status.applied.length} applied, ${status.pending.length} pending`)
    
    await db.disconnect()
    process.exit(0)
    
  } catch (error) {
    logger.error('Rollback failed:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...')
  process.exit(0)
})

// Run rollback
rollbackMigration().catch(error => {
  logger.error('Unhandled error:', error)
  process.exit(1)
})