import { UserProfile, UserProfileSchema } from '@focus-academy/shared'
import { BaseRepository } from './base-repository'
import { createLogger } from '../../utils/logger'

const logger = createLogger('user-profile-repository')

/**
 * Repository for UserProfile entity operations
 * Handles user preferences, settings, and onboarding status
 */
export class UserProfileRepository extends BaseRepository<UserProfile> {
  constructor() {
    super('user_profiles', UserProfileSchema)
  }

  /**
   * Find user profile by user ID
   */
  async findByUserId(userId: string): Promise<UserProfile | null> {
    try {
      const profiles = await this.findBy({ userId })
      return profiles.length > 0 ? profiles[0] : null
    } catch (error) {
      logger.error('Failed to find user profile by user ID', { userId, error })
      throw error
    }
  }

  /**
   * Create user profile with default settings
   */
  async createWithDefaults(userId: string, data?: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const defaultProfile = {
        userId,
        timezone: 'UTC',
        preferredLanguage: 'en',
        privacySettings: {
          biometricProcessing: true,
          dataSharing: false,
          analyticsTracking: true,
          thirdPartyIntegrations: false,
        },
        notificationPreferences: {
          emailEnabled: true,
          pushEnabled: false,
          challengeReminders: true,
          progressUpdates: true,
          streakAlerts: true,
          achievementNotifications: true,
        },
        onboardingCompleted: false,
        ...data,
      }

      return this.create(defaultProfile as Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>)
    } catch (error) {
      logger.error('Failed to create user profile with defaults', { userId, error })
      throw error
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(
    userId: string, 
    privacySettings: Record<string, unknown>
  ): Promise<UserProfile | null> {
    try {
      const profile = await this.findByUserId(userId)
      if (!profile) {
        return null
      }

      const updatedSettings = {
        ...profile.privacySettings,
        ...privacySettings,
      }

      return this.update(profile.id, { 
        privacySettings: updatedSettings 
      } as Partial<UserProfile>)
    } catch (error) {
      logger.error('Failed to update privacy settings', { userId, error })
      throw error
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    userId: string, 
    notificationPreferences: Record<string, unknown>
  ): Promise<UserProfile | null> {
    try {
      const profile = await this.findByUserId(userId)
      if (!profile) {
        return null
      }

      const updatedPreferences = {
        ...profile.notificationPreferences,
        ...notificationPreferences,
      }

      return this.update(profile.id, { 
        notificationPreferences: updatedPreferences 
      } as Partial<UserProfile>)
    } catch (error) {
      logger.error('Failed to update notification preferences', { userId, error })
      throw error
    }
  }

  /**
   * Mark onboarding as completed
   */
  async completeOnboarding(userId: string): Promise<UserProfile | null> {
    try {
      const profile = await this.findByUserId(userId)
      if (!profile) {
        return null
      }

      return this.update(profile.id, { 
        onboardingCompleted: true 
      } as Partial<UserProfile>)
    } catch (error) {
      logger.error('Failed to complete onboarding', { userId, error })
      throw error
    }
  }

  /**
   * Update user timezone
   */
  async updateTimezone(userId: string, timezone: string): Promise<UserProfile | null> {
    try {
      const profile = await this.findByUserId(userId)
      if (!profile) {
        return null
      }

      return this.update(profile.id, { 
        timezone 
      } as Partial<UserProfile>)
    } catch (error) {
      logger.error('Failed to update timezone', { userId, timezone, error })
      throw error
    }
  }

  /**
   * Update preferred language
   */
  async updateLanguage(userId: string, preferredLanguage: string): Promise<UserProfile | null> {
    try {
      const profile = await this.findByUserId(userId)
      if (!profile) {
        return null
      }

      return this.update(profile.id, { 
        preferredLanguage 
      } as Partial<UserProfile>)
    } catch (error) {
      logger.error('Failed to update language', { userId, preferredLanguage, error })
      throw error
    }
  }

  /**
   * Find profiles by timezone
   */
  async findByTimezone(timezone: string, options?: {
    limit?: number
    offset?: number
  }): Promise<UserProfile[]> {
    try {
      return this.findBy({ timezone }, {
        limit: options?.limit,
        offset: options?.offset,
        orderBy: 'createdAt',
        orderDirection: 'DESC',
      })
    } catch (error) {
      logger.error('Failed to find profiles by timezone', { timezone, error })
      throw error
    }
  }

  /**
   * Find profiles by language
   */
  async findByLanguage(preferredLanguage: string, options?: {
    limit?: number
    offset?: number
  }): Promise<UserProfile[]> {
    try {
      return this.findBy({ preferredLanguage }, {
        limit: options?.limit,
        offset: options?.offset,
        orderBy: 'createdAt',
        orderDirection: 'DESC',
      })
    } catch (error) {
      logger.error('Failed to find profiles by language', { preferredLanguage, error })
      throw error
    }
  }

  /**
   * Find profiles that haven't completed onboarding
   */
  async findIncompleteOnboarding(options?: {
    limit?: number
    offset?: number
    olderThanDays?: number
  }): Promise<UserProfile[]> {
    try {
      const conditions: Record<string, any> = { onboardingCompleted: false }
      
      if (options?.olderThanDays) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - options.olderThanDays)
        
        const db = this.getDatabase()
        const query = `
          SELECT * FROM user_profiles 
          WHERE onboarding_completed = false AND created_at <= $1
          ORDER BY created_at ASC
          ${options?.limit ? `LIMIT $2` : ''}
          ${options?.offset ? `OFFSET $${options?.limit ? 3 : 2}` : ''}
        `
        
        const params = [cutoffDate]
        if (options?.limit) params.push(options.limit)
        if (options?.offset) params.push(options.offset)
        
        const rows = await db.query(query, params)
        return rows.map(row => this.mapRowToEntity(row))
      }
      
      return this.findBy(conditions, {
        limit: options?.limit,
        offset: options?.offset,
        orderBy: 'createdAt',
        orderDirection: 'ASC',
      })
    } catch (error) {
      logger.error('Failed to find incomplete onboarding profiles', { options, error })
      throw error
    }
  }

  /**
   * Get profile statistics
   */
  async getStatistics(): Promise<{
    total: number
    completedOnboarding: number
    byLanguage: Record<string, number>
    byTimezone: Record<string, number>
  }> {
    try {
      const db = this.getDatabase()
      
      const [totalResult, completedResult, languageResult, timezoneResult] = await Promise.all([
        db.query('SELECT COUNT(*) as count FROM user_profiles'),
        db.query('SELECT COUNT(*) as count FROM user_profiles WHERE onboarding_completed = true'),
        db.query(`
          SELECT preferred_language, COUNT(*) as count 
          FROM user_profiles 
          GROUP BY preferred_language 
          ORDER BY count DESC
        `),
        db.query(`
          SELECT timezone, COUNT(*) as count 
          FROM user_profiles 
          GROUP BY timezone 
          ORDER BY count DESC 
          LIMIT 10
        `),
      ])

      const byLanguage: Record<string, number> = {}
      languageResult.forEach((row: any) => {
        byLanguage[row.preferred_language] = parseInt(row.count, 10)
      })

      const byTimezone: Record<string, number> = {}
      timezoneResult.forEach((row: any) => {
        byTimezone[row.timezone] = parseInt(row.count, 10)
      })

      return {
        total: parseInt(totalResult[0].count, 10),
        completedOnboarding: parseInt(completedResult[0].count, 10),
        byLanguage,
        byTimezone,
      }
    } catch (error) {
      logger.error('Failed to get profile statistics', error)
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