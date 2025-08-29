import { Pool, PoolClient, PoolConfig } from 'pg'
import { createLogger } from '../utils/logger'

const logger = createLogger('database')

/**
 * Database connection configuration
 */
interface DatabaseConfig extends PoolConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl?: boolean | object
}

/**
 * Database connection pool manager
 * Handles connection pooling, error handling, and health checks
 */
class DatabaseConnection {
  private pool: Pool | null = null
  private config: DatabaseConfig

  constructor(config: DatabaseConfig) {
    this.config = {
      ...config,
      max: config.max || 20, // Maximum number of connections in pool
      idleTimeoutMillis: config.idleTimeoutMillis || 30000, // Close idle connections after 30s
      connectionTimeoutMillis: config.connectionTimeoutMillis || 2000, // Return error after 2s if no connection available
    }
  }

  /**
   * Initialize the database connection pool
   */
  async connect(): Promise<void> {
    try {
      this.pool = new Pool(this.config)
      
      // Test the connection
      const client = await this.pool.connect()
      await client.query('SELECT NOW()')
      client.release()
      
      logger.info('Database connection established successfully')
      
      // Handle pool errors
      this.pool.on('error', (err) => {
        logger.error('Unexpected error on idle client', err)
      })
      
    } catch (error) {
      logger.error('Failed to connect to database', error)
      throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get a client from the connection pool
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.')
    }
    
    try {
      return await this.pool.connect()
    } catch (error) {
      logger.error('Failed to get database client', error)
      throw new Error(`Failed to get database client: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Execute a query with automatic client management
   */
  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const client = await this.getClient()
    
    try {
      const start = Date.now()
      const result = await client.query(text, params)
      const duration = Date.now() - start
      
      logger.debug('Executed query', { 
        query: text, 
        duration: `${duration}ms`, 
        rows: result.rowCount 
      })
      
      return result.rows
    } catch (error) {
      logger.error('Query execution failed', { query: text, error })
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Execute a transaction with automatic rollback on error
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient()
    
    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Transaction rolled back', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1')
      return true
    } catch (error) {
      logger.error('Database health check failed', error)
      return false
    }
  }

  /**
   * Close all connections in the pool
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
      logger.info('Database connection pool closed')
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    if (!this.pool) {
      return null
    }
    
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    }
  }
}

// Singleton instance
let dbConnection: DatabaseConnection | null = null

/**
 * Initialize database connection with configuration
 */
export function initializeDatabase(config: DatabaseConfig): DatabaseConnection {
  if (dbConnection) {
    throw new Error('Database already initialized')
  }
  
  dbConnection = new DatabaseConnection(config)
  return dbConnection
}

/**
 * Get the database connection instance
 */
export function getDatabase(): DatabaseConnection {
  if (!dbConnection) {
    throw new Error('Database not initialized. Call initializeDatabase() first.')
  }
  
  return dbConnection
}

/**
 * Reset the database connection (for testing purposes)
 */
export function resetDatabase(): void {
  dbConnection = null
}

/**
 * Create database configuration from environment variables
 */
export function createDatabaseConfig(): DatabaseConfig {
  const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
  }
  
  return {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT!, 10),
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  }
}

export type { DatabaseConfig, DatabaseConnection }