import { readdir, readFile } from 'fs/promises'
import { MigrationRunner } from '../migrations/migration-runner'
import { getDatabase } from '../connection'

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  readFile: jest.fn(),
}))

// Mock database connection
jest.mock('../connection', () => ({
  getDatabase: jest.fn(),
}))

// Mock logger
jest.mock('../../utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}))

describe('MigrationRunner', () => {
  let mockDb: any
  let mockClient: any
  let migrationRunner: MigrationRunner

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    }
    
    mockDb = {
      getClient: jest.fn().mockResolvedValue(mockClient),
      transaction: jest.fn(),
    }
    
    ;(getDatabase as jest.Mock).mockReturnValue(mockDb)
    
    migrationRunner = new MigrationRunner()
  })

  describe('runMigrations', () => {
    it('should run pending migrations successfully', async () => {
      // Mock file system
      ;(readdir as jest.Mock).mockResolvedValue([
        '20240101_120000_create_users_table.sql',
        '20240101_121000_create_organizations_table.sql',
      ])
      
      ;(readFile as jest.Mock)
        .mockResolvedValueOnce('CREATE TABLE users (...);')
        .mockResolvedValueOnce('CREATE TABLE organizations (...);')
      
      // Mock database responses
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // Initialize migrations table
        .mockResolvedValueOnce({ rows: [] }) // Get applied migrations (empty)
        .mockResolvedValueOnce({ rows: [] }) // Execute first migration
        .mockResolvedValueOnce({ rows: [] }) // Record first migration
        .mockResolvedValueOnce({ rows: [] }) // Execute second migration
        .mockResolvedValueOnce({ rows: [] }) // Record second migration
      
      // Mock transaction
      mockDb.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockClient)
      })
      
      const results = await migrationRunner.runMigrations()
      
      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[0].id).toBe('20240101_120000')
      expect(results[1].success).toBe(true)
      expect(results[1].id).toBe('20240101_121000')
    })

    it('should skip already applied migrations', async () => {
      // Mock file system
      ;(readdir as jest.Mock).mockResolvedValue([
        '20240101_120000_create_users_table.sql',
        '20240101_121000_create_organizations_table.sql',
      ])
      
      ;(readFile as jest.Mock)
        .mockResolvedValueOnce('CREATE TABLE users (...);')
        .mockResolvedValueOnce('CREATE TABLE organizations (...);')
      
      // Mock database responses - first migration already applied
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // Initialize migrations table
        .mockResolvedValueOnce({ 
          rows: [{ id: '20240101_120000' }] 
        }) // Get applied migrations
        .mockResolvedValueOnce({ rows: [] }) // Execute second migration
        .mockResolvedValueOnce({ rows: [] }) // Record second migration
      
      // Mock transaction
      mockDb.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockClient)
      })
      
      const results = await migrationRunner.runMigrations()
      
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('20240101_121000')
    })

    it('should handle migration execution errors', async () => {
      // Mock file system
      ;(readdir as jest.Mock).mockResolvedValue([
        '20240101_120000_create_users_table.sql',
      ])
      
      ;(readFile as jest.Mock).mockResolvedValueOnce('INVALID SQL;')
      
      // Mock database responses
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // Initialize migrations table
        .mockResolvedValueOnce({ rows: [] }) // Get applied migrations (empty)
        .mockRejectedValueOnce(new Error('SQL syntax error')) // Execute migration fails
      
      // Mock transaction that throws on error
      mockDb.transaction.mockImplementation(async (callback: any) => {
        try {
          return await callback(mockClient)
        } catch (error) {
          throw error
        }
      })
      
      await expect(migrationRunner.runMigrations()).rejects.toThrow('Migration failed')
    })

    it('should handle no pending migrations', async () => {
      // Mock file system
      ;(readdir as jest.Mock).mockResolvedValue([
        '20240101_120000_create_users_table.sql',
      ])
      
      ;(readFile as jest.Mock).mockResolvedValueOnce('CREATE TABLE users (...);')
      
      // Mock database responses - migration already applied
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // Initialize migrations table
        .mockResolvedValueOnce({ 
          rows: [{ id: '20240101_120000' }] 
        }) // Get applied migrations
      
      // Mock transaction
      mockDb.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockClient)
      })
      
      const results = await migrationRunner.runMigrations()
      
      expect(results).toHaveLength(0)
    })
  })

  describe('getMigrationStatus', () => {
    it('should return applied and pending migrations', async () => {
      // Mock file system
      ;(readdir as jest.Mock).mockResolvedValue([
        '20240101_120000_create_users_table.sql',
        '20240101_121000_create_organizations_table.sql',
        '20240101_122000_create_user_profiles_table.sql',
      ])
      
      ;(readFile as jest.Mock)
        .mockResolvedValueOnce('CREATE TABLE users (...);')
        .mockResolvedValueOnce('CREATE TABLE organizations (...);')
        .mockResolvedValueOnce('CREATE TABLE user_profiles (...);')
      
      // Mock database responses - first two migrations applied
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // Initialize migrations table
        .mockResolvedValueOnce({ 
          rows: [
            { id: '20240101_120000' },
            { id: '20240101_121000' }
          ] 
        }) // Get applied migrations
      
      const status = await migrationRunner.getMigrationStatus()
      
      expect(status.applied).toHaveLength(2)
      expect(status.pending).toHaveLength(1)
      expect(status.applied[0].id).toBe('20240101_120000')
      expect(status.applied[1].id).toBe('20240101_121000')
      expect(status.pending[0].id).toBe('20240101_122000')
    })
  })

  describe('rollbackLastMigration', () => {
    it('should rollback the last migration successfully', async () => {
      // Mock file system for rollback file
      ;(readFile as jest.Mock).mockResolvedValueOnce('DROP TABLE users;')
      
      // Mock database responses
      mockClient.query
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: '20240101_120000', 
            filename: '20240101_120000_create_users_table.sql' 
          }] 
        }) // Get last migration
        .mockResolvedValueOnce({ rows: [] }) // Execute rollback SQL
        .mockResolvedValueOnce({ rows: [] }) // Delete migration record
      
      // Mock transaction
      mockDb.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockClient)
      })
      
      await migrationRunner.rollbackLastMigration()
      
      expect(readFile).toHaveBeenCalledWith(
        expect.stringContaining('20240101_120000_create_users_table.rollback.sql'),
        'utf-8'
      )
      expect(mockClient.query).toHaveBeenCalledWith('DROP TABLE users;')
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM schema_migrations WHERE id = $1',
        ['20240101_120000']
      )
    })

    it('should handle no migrations to rollback', async () => {
      // Mock database responses - no migrations
      mockClient.query.mockResolvedValueOnce({ rows: [] })
      
      // Mock transaction
      mockDb.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockClient)
      })
      
      await expect(migrationRunner.rollbackLastMigration()).rejects.toThrow('No migrations to rollback')
    })

    it('should handle missing rollback file', async () => {
      // Mock database responses
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{ 
          id: '20240101_120000', 
          filename: '20240101_120000_create_users_table.sql' 
        }] 
      })
      
      // Mock file system - rollback file not found
      ;(readFile as jest.Mock).mockRejectedValueOnce(new Error('File not found'))
      
      // Mock transaction
      mockDb.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockClient)
      })
      
      await expect(migrationRunner.rollbackLastMigration()).rejects.toThrow('Rollback file not found')
    })
  })

  describe('parseTimestamp', () => {
    it('should parse timestamp correctly', () => {
      const runner = new MigrationRunner()
      // Access private method for testing
      const parseTimestamp = (runner as any).parseTimestamp.bind(runner)
      
      const timestamp = parseTimestamp('20240101_120000')
      
      expect(timestamp).toEqual(new Date(2024, 0, 1, 12, 0, 0)) // Month is 0-indexed
    })
  })

  describe('calculateChecksum', () => {
    it('should calculate consistent checksum', () => {
      const runner = new MigrationRunner()
      // Access private method for testing
      const calculateChecksum = (runner as any).calculateChecksum.bind(runner)
      
      const checksum1 = calculateChecksum('CREATE TABLE test ();')
      const checksum2 = calculateChecksum('CREATE TABLE test ();')
      const checksum3 = calculateChecksum('CREATE TABLE different ();')
      
      expect(checksum1).toBe(checksum2)
      expect(checksum1).not.toBe(checksum3)
      expect(checksum1).toMatch(/^[a-f0-9]{64}$/) // SHA-256 hex format
    })
  })
})