import { z } from 'zod'
import { BaseRepository } from '../base-repository'
import { getDatabase } from '../../connection'

// Mock database connection
jest.mock('../../connection', () => ({
  getDatabase: jest.fn(),
}))

// Mock logger
jest.mock('../../../utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}))

// Test entity schema
const TestEntitySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

type TestEntity = z.infer<typeof TestEntitySchema>

// Test repository implementation
class TestRepository extends BaseRepository<TestEntity> {
  constructor() {
    super('test_entities', TestEntitySchema)
  }
}

describe('BaseRepository', () => {
  let mockDb: any
  let repository: TestRepository

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn(),
    }
    
    ;(getDatabase as jest.Mock).mockReturnValue(mockDb)
    
    repository = new TestRepository()
  })

  describe('mapRowToEntity', () => {
    it('should convert snake_case to camelCase', () => {
      const row = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Entity',
        email: 'test@example.com',
        is_active: true,
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-01T00:00:00Z'),
      }

      const entity = (repository as any).mapRowToEntity(row)

      expect(entity).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Entity',
        email: 'test@example.com',
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      })
    })

    it('should parse date strings', () => {
      const row = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Entity',
        email: 'test@example.com',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const entity = (repository as any).mapRowToEntity(row)

      expect(entity.createdAt).toBeInstanceOf(Date)
      expect(entity.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('mapEntityToRow', () => {
    it('should convert camelCase to snake_case', () => {
      const entity = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Entity',
        email: 'test@example.com',
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      }

      const row = (repository as any).mapEntityToRow(entity)

      expect(row).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Entity',
        email: 'test@example.com',
        is_active: true,
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-01T00:00:00Z'),
      })
    })
  })

  describe('buildWhereClause', () => {
    it('should build WHERE clause for simple conditions', () => {
      const conditions = { name: 'Test', isActive: true }
      const result = (repository as any).buildWhereClause(conditions)

      expect(result.clause).toBe('WHERE name = $1 AND is_active = $2')
      expect(result.values).toEqual(['Test', true])
    })

    it('should handle null values', () => {
      const conditions = { name: null }
      const result = (repository as any).buildWhereClause(conditions)

      expect(result.clause).toBe('WHERE name IS NULL')
      expect(result.values).toEqual([])
    })

    it('should handle array values (IN clause)', () => {
      const conditions = { id: ['1', '2', '3'] }
      const result = (repository as any).buildWhereClause(conditions)

      expect(result.clause).toBe('WHERE id IN ($1, $2, $3)')
      expect(result.values).toEqual(['1', '2', '3'])
    })

    it('should return empty clause for no conditions', () => {
      const conditions = {}
      const result = (repository as any).buildWhereClause(conditions)

      expect(result.clause).toBe('')
      expect(result.values).toEqual([])
    })
  })

  describe('findById', () => {
    it('should find entity by ID', async () => {
      const mockRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Entity',
        email: 'test@example.com',
        is_active: true,
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-01T00:00:00Z'),
      }

      mockDb.query.mockResolvedValue([mockRow])

      const result = await repository.findById('123e4567-e89b-12d3-a456-426614174000')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM test_entities WHERE id = $1',
        ['123e4567-e89b-12d3-a456-426614174000']
      )
      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Entity',
        email: 'test@example.com',
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      })
    })

    it('should return null when entity not found', async () => {
      mockDb.query.mockResolvedValue([])

      const result = await repository.findById('nonexistent-id')

      expect(result).toBeNull()
    })

    it('should handle database errors', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'))

      await expect(repository.findById('test-id')).rejects.toThrow('Failed to find test_entities')
    })
  })

  describe('create', () => {
    it('should create new entity', async () => {
      const entityData = {
        name: 'New Entity',
        email: 'new@example.com',
        isActive: true,
      }

      const mockCreatedRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'New Entity',
        email: 'new@example.com',
        is_active: true,
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-01T00:00:00Z'),
      }

      mockDb.query.mockResolvedValue([mockCreatedRow])

      const result = await repository.create(entityData)

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO test_entities'),
        ['New Entity', 'new@example.com', true]
      )
      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000')
      expect(result.name).toBe('New Entity')
    })

    it('should handle creation errors', async () => {
      mockDb.query.mockRejectedValue(new Error('Unique constraint violation'))

      await expect(repository.create({
        name: 'Test',
        email: 'test@example.com',
        isActive: true,
      })).rejects.toThrow('Failed to create test_entities')
    })
  })

  describe('update', () => {
    it('should update entity', async () => {
      const updates = { name: 'Updated Name', isActive: false }
      
      const mockUpdatedRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Updated Name',
        email: 'test@example.com',
        is_active: false,
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-01T12:00:00Z'),
      }

      mockDb.query.mockResolvedValue([mockUpdatedRow])

      const result = await repository.update('123e4567-e89b-12d3-a456-426614174000', updates)

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE test_entities'),
        ['123e4567-e89b-12d3-a456-426614174000', 'Updated Name', false]
      )
      expect(result?.name).toBe('Updated Name')
      expect(result?.isActive).toBe(false)
    })

    it('should return null when entity not found', async () => {
      mockDb.query.mockResolvedValue([])

      const result = await repository.update('nonexistent-id', { name: 'Updated' })

      expect(result).toBeNull()
    })

    it('should throw error for empty updates', async () => {
      await expect(repository.update('test-id', {})).rejects.toThrow('No fields to update')
    })
  })

  describe('delete', () => {
    it('should delete entity', async () => {
      mockDb.query.mockResolvedValue([{ id: 'deleted-id' }])

      const result = await repository.delete('test-id')

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM test_entities WHERE id = $1',
        ['test-id']
      )
      expect(result).toBe(true)
    })

    it('should return false when entity not found', async () => {
      mockDb.query.mockResolvedValue([])

      const result = await repository.delete('nonexistent-id')

      expect(result).toBe(false)
    })
  })

  describe('count', () => {
    it('should count entities with conditions', async () => {
      mockDb.query.mockResolvedValue([{ count: '5' }])

      const result = await repository.count({ isActive: true })

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM test_entities WHERE is_active = $1',
        [true]
      )
      expect(result).toBe(5)
    })

    it('should count all entities when no conditions', async () => {
      mockDb.query.mockResolvedValue([{ count: '10' }])

      const result = await repository.count()

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM test_entities ',
        []
      )
      expect(result).toBe(10)
    })
  })

  describe('exists', () => {
    it('should return true when entity exists', async () => {
      mockDb.query.mockResolvedValue([{ exists: true }])

      const result = await repository.exists('test-id')

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT 1 FROM test_entities WHERE id = $1 LIMIT 1',
        ['test-id']
      )
      expect(result).toBe(true)
    })

    it('should return false when entity does not exist', async () => {
      mockDb.query.mockResolvedValue([])

      const result = await repository.exists('nonexistent-id')

      expect(result).toBe(false)
    })
  })

  describe('executeInTransaction', () => {
    it('should execute callback in transaction', async () => {
      const mockCallback = jest.fn().mockResolvedValue('transaction result')
      mockDb.transaction.mockImplementation(async (callback: any) => {
        return await callback('mock-client')
      })

      const result = await repository.executeInTransaction(mockCallback)

      expect(mockDb.transaction).toHaveBeenCalled()
      expect(mockCallback).toHaveBeenCalledWith('mock-client')
      expect(result).toBe('transaction result')
    })
  })
})