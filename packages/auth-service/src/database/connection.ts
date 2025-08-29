import { Pool } from 'pg';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

let pool: Pool;
let redis: Redis;

/**
 * Establishes connections to PostgreSQL and Redis databases.
 * Configures connection pools and error handling for both services.
 * 
 * @throws {Error} When database connection fails
 * 
 * @example
 * ```typescript
 * import { connectDatabase } from './database/connection';
 * 
 * await connectDatabase();
 * ```
 */
export async function connectDatabase(): Promise<void> {
  try {
    // PostgreSQL connection
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'focus_academy',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test PostgreSQL connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('PostgreSQL connected successfully');

    // Redis connection
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redis.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}

/**
 * Returns the PostgreSQL connection pool instance.
 * 
 * @returns {Pool} PostgreSQL connection pool
 * @throws {Error} When database is not connected
 * 
 * @example
 * ```typescript
 * import { getPool } from './database/connection';
 * 
 * const pool = getPool();
 * const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
 * ```
 */
export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database not connected');
  }
  return pool;
}

/**
 * Returns the Redis client instance.
 * 
 * @returns {Redis} Redis client instance
 * @throws {Error} When Redis is not connected
 * 
 * @example
 * ```typescript
 * import { getRedis } from './database/connection';
 * 
 * const redis = getRedis();
 * await redis.setex('refresh_token:userId', 3600, token);
 * ```
 */
export function getRedis(): Redis {
  if (!redis) {
    throw new Error('Redis not connected');
  }
  return redis;
}