import { User, UserSchema } from '@focus-academy/shared'
import { BaseRepository } from './base-repository'
import { createLogger } from '../../utils/logger'

const logger = createLogger('user-repository')

/**
 * Repository for User entity operations
 * Handles user authentication data, subscription tiers, and organization relationships
 */
export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users', UserSchema)
  }

  /**
   * Find user by email address
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const users = await this.findBy({ email })
      return users.length > 0 ? users[0] : null
    } catch (error) {
      logger.error('Failed to find user by email', { email, error })
      throw error
    }
  }

  /**
   * Find user by OAuth provider and ID
   */
  async findByOAuth(provider: string, oauthId: string): Promise<User | null> {
    try {
      const users = await this.findBy({ 
        oauthProvider: provider, 
        oauthId 
      })
      return users.length > 0 ? users[0] : null
    } catch (error) {
      logger.error('Failed to find user by OAuth', { provider, oauthId, error })
      throw error
    }
  }

  /**
   * Find users by organization ID
   */
  async findByOrganization(organizationId: string, options?: {
    limit?: number
    offset?: number
    includeInactive?: boolean
  }): Promise<User[]> {
    try {
      const conditions: Record<string, any> = { organizationId }
      
      if (!options?.includeInactive) {
        conditions.isActive = true
      }
      
      return this.findBy(conditions, {
        limit: options?.limit,
        offset: options?.offset,
        orderBy: 'createdAt',
        orderDirection: 'DESC',
      })
    } catch (error) {
      logger.error('Failed to find users by organization', { organizationId, error })
      throw error
    }
  }

  /**
   * Find users by subscription tier
   */
  async findBySubscriptionTier(tier: 'free' | 'premium' | 'enterprise', options?: {
    limit?: number
    offset?: number
  }): Promise<User[]> {
    try {
      return this.findBy({ subscriptionTier: tier }, {
        limit: options?.limit,
        offset: options?.offset,
        orderBy: 'createdAt',
        orderDirection: 'DESC',
      })
    } catch (error) {
      logger.error('Failed to find users by subscription tier', { tier, error })
      throw error
    }
  }

  /**
   * Update user's last active timestamp
   */
  async updateLastActive(id: string): Promise<User | null> {
    try {
      return this.update(id, { 
        lastActiveAt: new Date() 
      } as Partial<User>)
    } catch (error) {
      logger.error('Failed to update user last active', { id, error })
      throw error
    }
  }

  /**
   * Update user's subscription tier
   */
  async updateSubscriptionTier(id: string, tier: 'free' | 'premium' | 'enterprise'): Promise<User | null> {
    try {
      return this.update(id, { 
        subscriptionTier: tier 
      } as Partial<User>)
    } catch (error) {
      logger.error('Failed to update user subscription tier', { id, tier, error })
      throw error
    }
  }

  /**
   * Deactivate user account
   */
  async deactivate(id: string): Promise<User | null> {
    try {
      return this.update(id, { 
        isActive: false 
      } as Partial<User>)
    } catch (error) {
      logger.error('Failed to deactivate user', { id, error })
      throw error
    }
  }

  /**
   * Reactivate user account
   */
  async reactivate(id: string): Promise<User | null> {
    try {
      return this.update(id, { 
        isActive: true 
      } as Partial<User>)
    } catch (error) {
      logger.error('Failed to reactivate user', { id, error })
      throw error
    }
  }

  /**
   * Get user statistics
   */
  async getStatistics(): Promise<{
    total: number
    active: number
    byTier: Record<string, number>
    byProvider: Record<string, number>
  }> {
    try {
      const [
        total,
        active,
        freeUsers,
        premiumUsers,
        enterpriseUsers,
        googleUsers,
        microsoftUsers,
        appleUsers,
        metaUsers,
      ] = await Promise.all([
        this.count(),
        this.count({ isActive: true }),
        this.count({ subscriptionTier: 'free' }),
        this.count({ subscriptionTier: 'premium' }),
        this.count({ subscriptionTier: 'enterprise' }),
        this.count({ oauthProvider: 'google' }),
        this.count({ oauthProvider: 'microsoft' }),
        this.count({ oauthProvider: 'apple' }),
        this.count({ oauthProvider: 'meta' }),
      ])

      return {
        total,
        active,
        byTier: {
          free: freeUsers,
          premium: premiumUsers,
          enterprise: enterpriseUsers,
        },
        byProvider: {
          google: googleUsers,
          microsoft: microsoftUsers,
          apple: appleUsers,
          meta: metaUsers,
        },
      }
    } catch (error) {
      logger.error('Failed to get user statistics', error)
      throw error
    }
  }

  /**
   * Find recently active users
   */
  async findRecentlyActive(days: number = 30, options?: {
    limit?: number
    offset?: number
  }): Promise<User[]> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      
      const db = this.getDatabase()
      const query = `
        SELECT * FROM users 
        WHERE last_active_at >= $1 AND is_active = true
        ORDER BY last_active_at DESC
        ${options?.limit ? `LIMIT $2` : ''}
        ${options?.offset ? `OFFSET $${options?.limit ? 3 : 2}` : ''}
      `
      
      const params = [cutoffDate]
      if (options?.limit) params.push(options.limit)
      if (options?.offset) params.push(options.offset)
      
      const rows = await db.query(query, params)
      return rows.map(row => this.mapRowToEntity(row))
    } catch (error) {
      logger.error('Failed to find recently active users', { days, error })
      throw error
    }
  }

  /**
   * Get database instance (protected method made accessible for custom queries)
   */
  private getDatabase() {
    const { getDatabase } = require('../connection')
    return getDatabase()
  }
}