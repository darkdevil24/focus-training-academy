#!/usr/bin/env tsx

import { config } from 'dotenv'
import { MigrationRunner } from '../database/migrations/migration-runner'
import { initializeDatabase, createDatabaseConfig } from '../database/connection'
import { createLogger } from '../utils/logger'

// Load environment variables
config()

const logger = createLogger('migrate-script')

async function runMigrations() {
  try {
    logger.info('Starting database migrations...')
    
    // Initialize database connection
    const dbConfig = createDatabaseConfig()
    const db = initializeDatabase(dbConfig)
    await db.connect()
    
    // Run migrations
    const migrationRunner = new MigrationRunner()
    const results = await migrationRunner.runMigrations()
    
    if (results.length === 0) {
      logger.info('No migrations to run - database is up to date')
    } else {
      logger.info(`Successfully applied ${results.length} migrations`)
      results.forEach(result => {
        logger.info(`✓ ${result.id} (${result.executionTime}ms)`)
      })
    }
    
    // Get migration status
    const status = await migrationRunner.getMigrationStatus()
    logger.info(`Database status: ${status.applied.length} applied, ${status.pending.length} pending`)
    
    await db.disconnect()
    process.exit(0)
    
  } catch (error) {
    logger.error('Migration failed:', error)
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

// Run migrations
runMigrations().catch(error => {
  logger.error('Unhandled error:', error)
  process.exit(1)
})