import { PoolClient } from 'pg'
import { z } from 'zod'
import { getDatabase } from '../connection'
import { createLogger } from '../../utils/logger'

const logger = createLogger('base-repository')

/**
 * Base repository class providing common CRUD operations
 * All entity repositories should extend this class
 */
export abstract class BaseRepository<T> {
  protected tableName: string
  protected schema: z.ZodSchema<T>

  constructor(tableName: string, schema: z.ZodSchema<T>) {
    this.tableName = tableName
    this.schema = schema
  }

  /**
   * Validate entity data against schema
   */
  protected validateEntity(data: unknown): T {
    try {
      return this.schema.parse(data)
    } catch (error) {
      logger.error(`Validation failed for ${this.tableName}`, { error, data })
      throw new Error(`Invalid ${this.tableName} data: ${error instanceof Error ? error.message : 'Unknown validation error'}`)
    }
  }

  /**
   * Convert database row to entity object
   * Handles snake_case to camelCase conversion and date parsing
   */
  protected mapRowToEntity(row: Record<string, any>): T {
    const mapped: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(row)) {
      // Convert snake_case to camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      
      // Parse dates
      if (value instanceof Date) {
        mapped[camelKey] = value
      } else if (typeof value === 'string' && key.endsWith('_at')) {
        mapped[camelKey] = new Date(value)
      } else {
        mapped[camelKey] = value
      }
    }
    
    return this.validateEntity(mapped)
  }

  /**
   * Convert entity object to database row
   * Handles camelCase to snake_case conversion
   */
  protected mapEntityToRow(entity: Partial<T>): Record<string, any> {
    const mapped: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(entity as Record<string, any>)) {
      // Convert camelCase to snake_case
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
      mapped[snakeKey] = value
    }
    
    return mapped
  }

  /**
   * Build WHERE clause from conditions
   */
  protected buildWhereClause(conditions: Record<string, any>): { clause: string; values: any[] } {
    if (Object.keys(conditions).length === 0) {
      return { clause: '', values: [] }
    }
    
    const clauses: string[] = []
    const values: any[] = []
    let paramIndex = 1
    
    for (const [key, value] of Object.entries(conditions)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
      
      if (value === null) {
        clauses.push(`${snakeKey} IS NULL`)
      } else if (Array.isArray(value)) {
        const placeholders = value.map(() => `$${paramIndex++}`).join(', ')
        clauses.push(`${snakeKey} IN (${placeholders})`)
        values.push(...value)
      } else {
        clauses.push(`${snakeKey} = $${paramIndex++}`)
        values.push(value)
      }
    }
    
    return {
      clause: `WHERE ${clauses.join(' AND ')}`,
      values,
    }
  }

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<T | null> {
    const db = getDatabase()
    
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE id = $1`
      const rows = await db.query(query, [id])
      
      if (rows.length === 0) {
        return null
      }
      
      return this.mapRowToEntity(rows[0])
    } catch (error) {
      logger.error(`Failed to find ${this.tableName} by ID`, { id, error })
      throw new Error(`Failed to find ${this.tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Find entities by conditions
   */
  async findBy(conditions: Record<string, any>, options?: {
    limit?: number
    offset?: number
    orderBy?: string
    orderDirection?: 'ASC' | 'DESC'
  }): Promise<T[]> {
    const db = getDatabase()
    
    try {
      const { clause, values } = this.buildWhereClause(conditions)
      
      let query = `SELECT * FROM ${this.tableName} ${clause}`
      
      if (options?.orderBy) {
        const snakeOrderBy = options.orderBy.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
        query += ` ORDER BY ${snakeOrderBy} ${options.orderDirection || 'ASC'}`
      }
      
      if (options?.limit) {
        query += ` LIMIT $${values.length + 1}`
        values.push(options.limit)
      }
      
      if (options?.offset) {
        query += ` OFFSET $${values.length + 1}`
        values.push(options.offset)
      }
      
      const rows = await db.query(query, values)
      return rows.map(row => this.mapRowToEntity(row))
    } catch (error) {
      logger.error(`Failed to find ${this.tableName} by conditions`, { conditions, error })
      throw new Error(`Failed to find ${this.tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Find all entities
   */
  async findAll(options?: {
    limit?: number
    offset?: number
    orderBy?: string
    orderDirection?: 'ASC' | 'DESC'
  }): Promise<T[]> {
    return this.findBy({}, options)
  }

  /**
   * Create new entity
   */
  async create(entityData: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const db = getDatabase()
    
    try {
      const row = this.mapEntityToRow(entityData)
      
      // Remove id, created_at, updated_at as they're auto-generated
      delete row.id
      delete row.created_at
      delete row.updated_at
      
      const columns = Object.keys(row)
      const placeholders = columns.map((_, index) => `$${index + 1}`)
      const values = Object.values(row)
      
      const query = `
        INSERT INTO ${this.tableName} (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `
      
      const rows = await db.query(query, values)
      return this.mapRowToEntity(rows[0])
    } catch (error) {
      logger.error(`Failed to create ${this.tableName}`, { entityData, error })
      throw new Error(`Failed to create ${this.tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update entity by ID
   */
  async update(id: string, updates: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T | null> {
    const db = getDatabase()
    
    try {
      const row = this.mapEntityToRow(updates)
      
      // Remove id and created_at as they shouldn't be updated
      delete row.id
      delete row.created_at
      
      const columns = Object.keys(row)
      if (columns.length === 0) {
        throw new Error('No fields to update')
      }
      
      const setClauses = columns.map((col, index) => `${col} = $${index + 2}`)
      const values = [id, ...Object.values(row)]
      
      const query = `
        UPDATE ${this.tableName}
        SET ${setClauses.join(', ')}, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `
      
      const rows = await db.query(query, values)
      
      if (rows.length === 0) {
        return null
      }
      
      return this.mapRowToEntity(rows[0])
    } catch (error) {
      logger.error(`Failed to update ${this.tableName}`, { id, updates, error })
      throw new Error(`Failed to update ${this.tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete entity by ID
   */
  async delete(id: string): Promise<boolean> {
    const db = getDatabase()
    
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = $1`
      const rows = await db.query(query, [id])
      
      return rows.length > 0
    } catch (error) {
      logger.error(`Failed to delete ${this.tableName}`, { id, error })
      throw new Error(`Failed to delete ${this.tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Count entities by conditions
   */
  async count(conditions: Record<string, any> = {}): Promise<number> {
    const db = getDatabase()
    
    try {
      const { clause, values } = this.buildWhereClause(conditions)
      const query = `SELECT COUNT(*) as count FROM ${this.tableName} ${clause}`
      
      const rows = await db.query(query, values)
      return parseInt(rows[0].count, 10)
    } catch (error) {
      logger.error(`Failed to count ${this.tableName}`, { conditions, error })
      throw new Error(`Failed to count ${this.tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if entity exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const db = getDatabase()
    
    try {
      const query = `SELECT 1 FROM ${this.tableName} WHERE id = $1 LIMIT 1`
      const rows = await db.query(query, [id])
      
      return rows.length > 0
    } catch (error) {
      logger.error(`Failed to check if ${this.tableName} exists`, { id, error })
      throw new Error(`Failed to check ${this.tableName} existence: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Execute custom query with transaction support
   */
  async executeInTransaction<R>(callback: (client: PoolClient) => Promise<R>): Promise<R> {
    const db = getDatabase()
    return db.transaction(callback)
  }
}