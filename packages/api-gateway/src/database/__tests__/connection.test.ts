import { Pool, PoolClient } from 'pg'
import { DatabaseConnection, initializeDatabase, getDatabase, createDatabaseConfig, resetDatabase } from '../connection'

// Mock pg module
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    totalCount: 5,
    idleCount: 3,
    waitingCount: 0,
  })),
}))

// Mock winston logger
jest.mock('../../utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}))

describe('DatabaseConnection', () => {
  let mockPool: jest.Mocked<Pool>
  let mockClient: jest.Mocked<PoolClient>

  beforeEach(() => {
    jest.clearAllMocks()
    resetDatabase() // Reset singleton state between tests
    
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    } as any
    
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      totalCount: 5,
      idleCount: 3,
      waitingCount: 0,
    } as any
    
    ;(Pool as jest.MockedClass<typeof Pool>).mockImplementation(() => mockPool)
  })

  describe('connect', () => {
    it('should establish database connection successfully', async () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password',
      }
      
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 } as any)
      
      const db = initializeDatabase(config)
      await db.connect()
      
      expect(Pool).toHaveBeenCalledWith(expect.objectContaining({
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }))
      
      expect(mockPool.connect).toHaveBeenCalled()
      expect(mockClient.query).toHaveBeenCalledWith('SELECT NOW()')
      expect(mockClient.release).toHaveBeenCalled()
    })

    it('should handle connection errors', async () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password',
      }
      
      mockPool.connect.mockRejectedValue(new Error('Connection failed'))
      
      const db = initializeDatabase(config)
      
      await expect(db.connect()).rejects.toThrow('Database connection failed: Connection failed')
    })
  })

  describe('query', () => {
    it('should execute queries successfully', async () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password',
      }
      
      const mockResult = { rows: [{ id: 1, name: 'test' }], rowCount: 1 }
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // For connection test
        .mockResolvedValueOnce(mockResult as any) // For actual query
      
      const db = initializeDatabase(config)
      await db.connect()
      
      const result = await db.query('SELECT * FROM users WHERE id = $1', ['123'])
      
      expect(result).toEqual([{ id: 1, name: 'test' }])
      expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', ['123'])
      expect(mockClient.release).toHaveBeenCalledTimes(2) // Once for connection test, once for query
    })

    it('should handle query errors and release client', async () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password',
      }
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // For connection test
        .mockRejectedValueOnce(new Error('Query failed')) // For actual query
      
      const db = initializeDatabase(config)
      await db.connect()
      
      await expect(db.query('INVALID SQL')).rejects.toThrow('Query failed')
      expect(mockClient.release).toHaveBeenCalledTimes(2) // Once for connection test, once for failed query
    })
  })

  describe('transaction', () => {
    it('should execute transaction successfully', async () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password',
      }
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // For connection test
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // For BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 } as any) // For callback query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // For COMMIT
      
      const db = initializeDatabase(config)
      await db.connect()
      
      const result = await db.transaction(async (client) => {
        const queryResult = await client.query('INSERT INTO users (name) VALUES ($1) RETURNING id', ['test'])
        return queryResult.rows[0]
      })
      
      expect(result).toEqual({ id: 1 })
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN')
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT')
    })

    it('should rollback transaction on error', async () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password',
      }
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // For connection test
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // For BEGIN
        .mockRejectedValueOnce(new Error('Transaction failed')) // For callback query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // For ROLLBACK
      
      const db = initializeDatabase(config)
      await db.connect()
      
      await expect(db.transaction(async (client) => {
        await client.query('INVALID SQL')
      })).rejects.toThrow('Transaction failed')
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN')
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK')
      expect(mockClient.release).toHaveBeenCalledTimes(2) // Once for connection test, once for transaction
    })
  })

  describe('healthCheck', () => {
    it('should return true for healthy database', async () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password',
      }
      
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 } as any)
      
      const db = initializeDatabase(config)
      await db.connect()
      
      const isHealthy = await db.healthCheck()
      
      expect(isHealthy).toBe(true)
    })

    it('should return false for unhealthy database', async () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password',
      }
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // For connection test
        .mockRejectedValueOnce(new Error('Health check failed')) // For health check
      
      const db = initializeDatabase(config)
      await db.connect()
      
      const isHealthy = await db.healthCheck()
      
      expect(isHealthy).toBe(false)
    })
  })

  describe('getPoolStats', () => {
    it('should return pool statistics', async () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password',
      }
      
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 } as any)
      
      const db = initializeDatabase(config)
      await db.connect()
      
      const stats = db.getPoolStats()
      
      expect(stats).toEqual({
        totalCount: 5,
        idleCount: 3,
        waitingCount: 0,
      })
    })

    it('should return null when not connected', () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password',
      }
      
      const db = initializeDatabase(config)
      const stats = db.getPoolStats()
      
      expect(stats).toBeNull()
    })
  })
})

describe('createDatabaseConfig', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('should create config from environment variables', () => {
    process.env.DB_HOST = 'localhost'
    process.env.DB_PORT = '5432'
    process.env.DB_NAME = 'test_db'
    process.env.DB_USER = 'test_user'
    process.env.DB_PASSWORD = 'test_password'
    process.env.NODE_ENV = 'development'
    
    const config = createDatabaseConfig()
    
    expect(config).toEqual({
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      user: 'test_user',
      password: 'test_password',
      ssl: false,
    })
  })

  it('should enable SSL in production', () => {
    process.env.DB_HOST = 'localhost'
    process.env.DB_PORT = '5432'
    process.env.DB_NAME = 'test_db'
    process.env.DB_USER = 'test_user'
    process.env.DB_PASSWORD = 'test_password'
    process.env.NODE_ENV = 'production'
    
    const config = createDatabaseConfig()
    
    expect(config.ssl).toEqual({ rejectUnauthorized: false })
  })

  it('should throw error for missing environment variables', () => {
    delete process.env.DB_HOST
    
    expect(() => createDatabaseConfig()).toThrow('Missing required environment variables: DB_HOST')
  })
})