import { Organization, OrganizationSchema } from '@focus-academy/shared'
import { BaseRepository } from './base-repository'
import { createLogger } from '../../utils/logger'

const logger = createLogger('organization-repository')

/**
 * Repository for Organization entity operations
 * Handles enterprise organizations, subscription plans, and user management
 */
export class OrganizationRepository extends BaseRepository<Organization> {
  constructor() {
    super('organizations', OrganizationSchema)
  }

  /**
   * Find organization by domain
   */
  async findByDomain(domain: string): Promise<Organization | null> {
    try {
      const organizations = await this.findBy({ domain })
      return organizations.length > 0 ? organizations[0] : null
    } catch (error) {
      logger.error('Failed to find organization by domain', { domain, error })
      throw error
    }
  }

  /**
   * Find organizations by subscription plan
   */
  async findBySubscriptionPlan(plan: 'enterprise' | 'education', options?: {
    limit?: number
    offset?: number
    includeInactive?: boolean
  }): Promise<Organization[]> {
    try {
      const conditions: Record<string, any> = { subscriptionPlan: plan }
      
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
      logger.error('Failed to find organizations by subscription plan', { plan, error })
      throw error
    }
  }

  /**
   * Find organizations by admin user ID
   */
  async findByAdminUser(adminUserId: string): Promise<Organization[]> {
    try {
      return this.findBy({ adminUserId }, {
        orderBy: 'createdAt',
        orderDirection: 'DESC',
      })
    } catch (error) {
      logger.error('Failed to find organizations by admin user', { adminUserId, error })
      throw error
    }
  }

  /**
   * Update organization settings
   */
  async updateSettings(
    id: string, 
    settings: Record<string, unknown>
  ): Promise<Organization | null> {
    try {
      const organization = await this.findById(id)
      if (!organization) {
        return null
      }

      const updatedSettings = {
        ...organization.settings,
        ...settings,
      }

      return this.update(id, { 
        settings: updatedSettings 
      } as Partial<Organization>)
    } catch (error) {
      logger.error('Failed to update organization settings', { id, error })
      throw error
    }
  }

  /**
   * Update max users limit
   */
  async updateMaxUsers(id: string, maxUsers: number): Promise<Organization | null> {
    try {
      if (maxUsers <= 0) {
        throw new Error('Max users must be greater than 0')
      }

      return this.update(id, { 
        maxUsers 
      } as Partial<Organization>)
    } catch (error) {
      logger.error('Failed to update max users', { id, maxUsers, error })
      throw error
    }
  }

  /**
   * Update admin user
   */
  async updateAdminUser(id: string, adminUserId: string): Promise<Organization | null> {
    try {
      return this.update(id, { 
        adminUserId 
      } as Partial<Organization>)
    } catch (error) {
      logger.error('Failed to update admin user', { id, adminUserId, error })
      throw error
    }
  }

  /**
   * Update billing email
   */
  async updateBillingEmail(id: string, billingEmail: string): Promise<Organization | null> {
    try {
      return this.update(id, { 
        billingEmail 
      } as Partial<Organization>)
    } catch (error) {
      logger.error('Failed to update billing email', { id, billingEmail, error })
      throw error
    }
  }

  /**
   * Deactivate organization
   */
  async deactivate(id: string): Promise<Organization | null> {
    try {
      return this.update(id, { 
        isActive: false 
      } as Partial<Organization>)
    } catch (error) {
      logger.error('Failed to deactivate organization', { id, error })
      throw error
    }
  }

  /**
   * Reactivate organization
   */
  async reactivate(id: string): Promise<Organization | null> {
    try {
      return this.update(id, { 
        isActive: true 
      } as Partial<Organization>)
    } catch (error) {
      logger.error('Failed to reactivate organization', { id, error })
      throw error
    }
  }

  /**
   * Get organization with user count
   */
  async findByIdWithUserCount(id: string): Promise<(Organization & { userCount: number }) | null> {
    try {
      const db = this.getDatabase()
      const query = `
        SELECT o.*, COUNT(u.id) as user_count
        FROM organizations o
        LEFT JOIN users u ON o.id = u.organization_id AND u.is_active = true
        WHERE o.id = $1
        GROUP BY o.id
      `
      
      const rows = await db.query(query, [id])
      
      if (rows.length === 0) {
        return null
      }
      
      const row = rows[0]
      const organization = this.mapRowToEntity(row)
      
      return {
        ...organization,
        userCount: parseInt(row.user_count, 10),
      }
    } catch (error) {
      logger.error('Failed to find organization with user count', { id, error })
      throw error
    }
  }

  /**
   * Get organizations with user counts
   */
  async findAllWithUserCounts(options?: {
    limit?: number
    offset?: number
    includeInactive?: boolean
  }): Promise<(Organization & { userCount: number })[]> {
    try {
      const db = this.getDatabase()
      
      let whereClause = ''
      const params: any[] = []
      
      if (!options?.includeInactive) {
        whereClause = 'WHERE o.is_active = true'
      }
      
      let query = `
        SELECT o.*, COUNT(u.id) as user_count
        FROM organizations o
        LEFT JOIN users u ON o.id = u.organization_id AND u.is_active = true
        ${whereClause}
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `
      
      if (options?.limit) {
        query += ` LIMIT $${params.length + 1}`
        params.push(options.limit)
      }
      
      if (options?.offset) {
        query += ` OFFSET $${params.length + 1}`
        params.push(options.offset)
      }
      
      const rows = await db.query(query, params)
      
      return rows.map(row => ({
        ...this.mapRowToEntity(row),
        userCount: parseInt(row.user_count, 10),
      }))
    } catch (error) {
      logger.error('Failed to find organizations with user counts', { options, error })
      throw error
    }
  }

  /**
   * Check if organization has reached user limit
   */
  async hasReachedUserLimit(id: string): Promise<boolean> {
    try {
      const orgWithCount = await this.findByIdWithUserCount(id)
      
      if (!orgWithCount) {
        throw new Error('Organization not found')
      }
      
      return orgWithCount.userCount >= orgWithCount.maxUsers
    } catch (error) {
      logger.error('Failed to check user limit', { id, error })
      throw error
    }
  }

  /**
   * Get organization statistics
   */
  async getStatistics(): Promise<{
    total: number
    active: number
    byPlan: Record<string, number>
    totalUsers: number
    averageUsersPerOrg: number
  }> {
    try {
      const db = this.getDatabase()
      
      const [totalResult, activeResult, planResult, userStatsResult] = await Promise.all([
        db.query('SELECT COUNT(*) as count FROM organizations'),
        db.query('SELECT COUNT(*) as count FROM organizations WHERE is_active = true'),
        db.query(`
          SELECT subscription_plan, COUNT(*) as count 
          FROM organizations 
          WHERE is_active = true
          GROUP BY subscription_plan
        `),
        db.query(`
          SELECT 
            COUNT(DISTINCT u.id) as total_users,
            COUNT(DISTINCT o.id) as active_orgs
          FROM organizations o
          LEFT JOIN users u ON o.id = u.organization_id AND u.is_active = true
          WHERE o.is_active = true
        `),
      ])

      const byPlan: Record<string, number> = {}
      planResult.forEach((row: any) => {
        byPlan[row.subscription_plan] = parseInt(row.count, 10)
      })

      const totalUsers = parseInt(userStatsResult[0].total_users, 10)
      const activeOrgs = parseInt(userStatsResult[0].active_orgs, 10)

      return {
        total: parseInt(totalResult[0].count, 10),
        active: parseInt(activeResult[0].count, 10),
        byPlan,
        totalUsers,
        averageUsersPerOrg: activeOrgs > 0 ? Math.round(totalUsers / activeOrgs) : 0,
      }
    } catch (error) {
      logger.error('Failed to get organization statistics', error)
      throw error
    }
  }

  /**
   * Search organizations by name
   */
  async searchByName(searchTerm: string, options?: {
    limit?: number
    offset?: number
    includeInactive?: boolean
  }): Promise<Organization[]> {
    try {
      const db = this.getDatabase()
      
      let whereClause = 'WHERE name ILIKE $1'
      const params = [`%${searchTerm}%`]
      
      if (!options?.includeInactive) {
        whereClause += ' AND is_active = true'
      }
      
      let query = `
        SELECT * FROM organizations 
        ${whereClause}
        ORDER BY name ASC
      `
      
      if (options?.limit) {
        query += ` LIMIT $${params.length + 1}`
        params.push(options.limit)
      }
      
      if (options?.offset) {
        query += ` OFFSET $${params.length + 1}`
        params.push(options.offset)
      }
      
      const rows = await db.query(query, params)
      return rows.map(row => this.mapRowToEntity(row))
    } catch (error) {
      logger.error('Failed to search organizations by name', { searchTerm, error })
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