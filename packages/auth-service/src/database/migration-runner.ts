import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export class MigrationRunner {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async runMigrations(): Promise<void> {
    try {
      // Create migrations table if it doesn't exist
      await this.createMigrationsTable();

      // Get all migration files
      const migrationsDir = path.join(__dirname, 'migrations', 'sql');
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      // Run each migration
      for (const file of migrationFiles) {
        await this.runMigration(file, migrationsDir);
      }

      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }

  private async createMigrationsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    await this.pool.query(query);
  }

  private async runMigration(filename: string, migrationsDir: string): Promise<void> {
    // Check if migration has already been run
    const checkQuery = 'SELECT filename FROM migrations WHERE filename = $1';
    const result = await this.pool.query(checkQuery, [filename]);

    if (result.rows.length > 0) {
      logger.info(`Migration ${filename} already executed, skipping`);
      return;
    }

    // Read and execute migration
    const migrationPath = path.join(migrationsDir, filename);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Execute migration SQL
      await client.query(migrationSQL);
      
      // Record migration as executed
      await client.query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [filename]
      );
      
      await client.query('COMMIT');
      logger.info(`Migration ${filename} executed successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Migration ${filename} failed:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async rollbackMigration(filename: string): Promise<void> {
    try {
      // Remove migration record
      await this.pool.query(
        'DELETE FROM migrations WHERE filename = $1',
        [filename]
      );
      
      logger.info(`Migration ${filename} rolled back`);
    } catch (error) {
      logger.error(`Rollback failed for ${filename}:`, error);
      throw error;
    }
  }
}