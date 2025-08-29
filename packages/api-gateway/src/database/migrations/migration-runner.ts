import { PoolClient } from 'pg'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { getDatabase } from '../connection'
import { createLogger } from '../../utils/logger'

const logger = createLogger('migration-runner')

/**
 * Migration metadata
 */
interface Migration {
  id: string
  filename: string
  timestamp: Date
  sql: string
}

/**
 * Migration execution result
 */
interface MigrationResult {
  id: string
  success: boolean
  error?: string
  executionTime: number
}

/**
 * Database migration runner
 * Handles executing SQL migration files in order and tracking applied migrations
 */
export class MigrationRunner {
  private migrationsPath: string

  constructor(migrationsPath: string = join(__dirname, 'sql')) {
    this.migrationsPath = migrationsPath
  }

  /**
   * Initialize the migrations table if it doesn't exist
   */
  private async initializeMigrationsTable(client: PoolClient): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW(),
        checksum VARCHAR(64) NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_schema_migrations_executed_at 
      ON schema_migrations(executed_at);
    `
    
    await client.query(createTableSQL)
    logger.info('Migrations table initialized')
  }

  /**
   * Get list of applied migrations from database
   */
  private async getAppliedMigrations(client: PoolClient): Promise<Set<string>> {
    const result = await client.query(
      'SELECT id FROM schema_migrations ORDER BY executed_at'
    )
    
    return new Set(result.rows.map(row => row.id))
  }

  /**
   * Load migration files from filesystem
   */
  private async loadMigrationFiles(): Promise<Migration[]> {
    try {
      const files = await readdir(this.migrationsPath)
      const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort() // Ensure chronological order
      
      const migrations: Migration[] = []
      
      for (const filename of migrationFiles) {
        const filePath = join(this.migrationsPath, filename)
        const sql = await readFile(filePath, 'utf-8')
        
        // Extract timestamp from filename (format: YYYYMMDD_HHMMSS_description.sql)
        const timestampMatch = filename.match(/^(\d{8}_\d{6})/)
        if (!timestampMatch) {
          throw new Error(`Invalid migration filename format: ${filename}`)
        }
        
        const timestampStr = timestampMatch[1]
        const timestamp = this.parseTimestamp(timestampStr)
        
        migrations.push({
          id: timestampStr,
          filename,
          timestamp,
          sql: sql.trim(),
        })
      }
      
      return migrations
    } catch (error) {
      logger.error('Failed to load migration files', error)
      throw new Error(`Failed to load migrations: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Parse timestamp from migration filename
   */
  private parseTimestamp(timestampStr: string): Date {
    // Format: YYYYMMDD_HHMMSS
    const year = parseInt(timestampStr.substring(0, 4), 10)
    const month = parseInt(timestampStr.substring(4, 6), 10) - 1 // Month is 0-indexed
    const day = parseInt(timestampStr.substring(6, 8), 10)
    const hour = parseInt(timestampStr.substring(9, 11), 10)
    const minute = parseInt(timestampStr.substring(11, 13), 10)
    const second = parseInt(timestampStr.substring(13, 15), 10)
    
    return new Date(year, month, day, hour, minute, second)
  }

  /**
   * Calculate checksum for migration content
   */
  private calculateChecksum(content: string): string {
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(content).digest('hex')
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(
    client: PoolClient, 
    migration: Migration
  ): Promise<MigrationResult> {
    const startTime = Date.now()
    
    try {
      logger.info(`Executing migration: ${migration.filename}`)
      
      // Execute the migration SQL
      await client.query(migration.sql)
      
      // Record the migration as applied
      const checksum = this.calculateChecksum(migration.sql)
      await client.query(
        'INSERT INTO schema_migrations (id, filename, checksum) VALUES ($1, $2, $3)',
        [migration.id, migration.filename, checksum]
      )
      
      const executionTime = Date.now() - startTime
      logger.info(`Migration completed: ${migration.filename} (${executionTime}ms)`)
      
      return {
        id: migration.id,
        success: true,
        executionTime,
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      logger.error(`Migration failed: ${migration.filename}`, error)
      
      return {
        id: migration.id,
        success: false,
        error: errorMessage,
        executionTime,
      }
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<MigrationResult[]> {
    const db = getDatabase()
    const results: MigrationResult[] = []
    
    await db.transaction(async (client) => {
      // Initialize migrations table
      await this.initializeMigrationsTable(client)
      
      // Get applied migrations
      const appliedMigrations = await this.getAppliedMigrations(client)
      
      // Load migration files
      const migrations = await this.loadMigrationFiles()
      
      // Filter out already applied migrations
      const pendingMigrations = migrations.filter(
        migration => !appliedMigrations.has(migration.id)
      )
      
      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations to run')
        return
      }
      
      logger.info(`Running ${pendingMigrations.length} pending migrations`)
      
      // Execute pending migrations in order
      for (const migration of pendingMigrations) {
        const result = await this.executeMigration(client, migration)
        results.push(result)
        
        // Stop on first failure
        if (!result.success) {
          throw new Error(`Migration failed: ${migration.filename} - ${result.error}`)
        }
      }
    })
    
    return results
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{
    applied: Migration[]
    pending: Migration[]
  }> {
    const db = getDatabase()
    const client = await db.getClient()
    
    try {
      await this.initializeMigrationsTable(client)
      
      const appliedMigrations = await this.getAppliedMigrations(client)
      const allMigrations = await this.loadMigrationFiles()
      
      const applied = allMigrations.filter(m => appliedMigrations.has(m.id))
      const pending = allMigrations.filter(m => !appliedMigrations.has(m.id))
      
      return { applied, pending }
    } finally {
      client.release()
    }
  }

  /**
   * Rollback the last migration
   */
  async rollbackLastMigration(): Promise<void> {
    const db = getDatabase()
    
    await db.transaction(async (client) => {
      // Get the last applied migration
      const result = await client.query(
        'SELECT id, filename FROM schema_migrations ORDER BY executed_at DESC LIMIT 1'
      )
      
      if (result.rows.length === 0) {
        throw new Error('No migrations to rollback')
      }
      
      const lastMigration = result.rows[0]
      
      // Look for rollback file
      const rollbackFilename = lastMigration.filename.replace('.sql', '.rollback.sql')
      const rollbackPath = join(this.migrationsPath, rollbackFilename)
      
      try {
        const rollbackSQL = await readFile(rollbackPath, 'utf-8')
        
        logger.info(`Rolling back migration: ${lastMigration.filename}`)
        
        // Execute rollback SQL
        await client.query(rollbackSQL)
        
        // Remove migration record
        await client.query(
          'DELETE FROM schema_migrations WHERE id = $1',
          [lastMigration.id]
        )
        
        logger.info(`Rollback completed: ${lastMigration.filename}`)
      } catch (error) {
        throw new Error(`Rollback file not found or invalid: ${rollbackFilename}`)
      }
    })
  }
}