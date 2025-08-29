import { UserProfileRepository } from '../user-profile-repository'
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

describe('UserProfileRepository', () => {
  let mockDb: any
  let userProfileRepository: UserProfileRepository

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn(),
    }
    
    ;(getDatabase as jest.Mock).mockReturnValue(mockDb)
    
    userProfileRepository = new UserProfileRepository()
  })

  const mockProfile = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    user_id: '456e7890-e89b-12d3-a456-426614174001',
    display_name: 'John Doe',
    timezone: 'America/New_York',
    preferred_language: 'en',
    privacy_settings: {
      biometricProcessing: true,
      dataSharing: false,
      analyticsTracking: true,
      thirdPartyIntegrations: false,
    },
    notification_preferences: {
      emailEnabled: true,
      pushEnabled: false,
      challengeReminders: true,
      progressUpdates: true,
      streakAlerts: true,
      achievementNotifications: true,
    },
    onboarding_completed: true,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  }

  describe('findByUserId', () => {
    it('should find profile by user ID', async () => {
      mockDb.query.mockResolvedValue([mockProfile])

      const result = await userProfileRepository.findByUserId('456e7890-e89b-12d3-a456-426614174001')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        ['456e7890-e89b-12d3-a456-426614174001']
      )
      expect(result?.userId).toBe('456e7890-e89b-12d3-a456-426614174001')
      expect(result?.displayName).toBe('John Doe')
    })

    it('should return null when profile not found', async () => {
      mockDb.query.mockResolvedValue([])

      const result = await userProfileRepository.findByUserId('789e0123-e89b-12d3-a456-426614174002')

      expect(result).toBeNull()
    })
  })

  describe('createWithDefaults', () => {
    it('should create profile with default settings', async () => {
      const createdProfile = { ...mockProfile, onboarding_completed: false }
      mockDb.query.mockResolvedValue([createdProfile])

      const result = await userProfileRepository.createWithDefaults('456e7890-e89b-12d3-a456-426614174001')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_profiles'),
        expect.arrayContaining(['456e7890-e89b-12d3-a456-426614174001'])
      )
      expect(result.userId).toBe('456e7890-e89b-12d3-a456-426614174001')
      expect(result.onboardingCompleted).toBe(false)
    })

    it('should create profile with custom data', async () => {
      const customData = { displayName: 'Custom Name', timezone: 'UTC' }
      const createdProfile = { ...mockProfile, ...customData }
      mockDb.query.mockResolvedValue([createdProfile])

      const result = await userProfileRepository.createWithDefaults('456e7890-e89b-12d3-a456-426614174001', customData)

      expect(result.displayName).toBe('Custom Name')
      expect(result.timezone).toBe('UTC')
    })
  })

  describe('updatePrivacySettings', () => {
    it('should update privacy settings', async () => {
      // Mock finding existing profile
      mockDb.query
        .mockResolvedValueOnce([mockProfile]) // findByUserId
        .mockResolvedValueOnce([{ // update
          ...mockProfile,
          privacy_settings: {
            ...mockProfile.privacy_settings,
            dataSharing: true,
          }
        }])

      const newSettings = { dataSharing: true }
      const result = await userProfileRepository.updatePrivacySettings('user-123', newSettings)

      expect(result?.privacySettings.dataSharing).toBe(true)
    })

    it('should return null when profile not found', async () => {
      mockDb.query.mockResolvedValueOnce([]) // findByUserId returns empty

      const result = await userProfileRepository.updatePrivacySettings('nonexistent-user', {})

      expect(result).toBeNull()
    })
  })

  describe('updateNotificationPreferences', () => {
    it('should update notification preferences', async () => {
      // Mock finding existing profile
      mockDb.query
        .mockResolvedValueOnce([mockProfile]) // findByUserId
        .mockResolvedValueOnce([{ // update
          ...mockProfile,
          notification_preferences: {
            ...mockProfile.notification_preferences,
            pushEnabled: true,
          }
        }])

      const newPreferences = { pushEnabled: true }
      const result = await userProfileRepository.updateNotificationPreferences('user-123', newPreferences)

      expect(result?.notificationPreferences.pushEnabled).toBe(true)
    })
  })

  describe('completeOnboarding', () => {
    it('should mark onboarding as completed', async () => {
      // Mock finding existing profile
      mockDb.query
        .mockResolvedValueOnce([mockProfile]) // findByUserId
        .mockResolvedValueOnce([{ // update
          ...mockProfile,
          onboarding_completed: true,
        }])

      const result = await userProfileRepository.completeOnboarding('user-123')

      expect(result?.onboardingCompleted).toBe(true)
    })
  })

  describe('updateTimezone', () => {
    it('should update user timezone', async () => {
      // Mock finding existing profile
      mockDb.query
        .mockResolvedValueOnce([mockProfile]) // findByUserId
        .mockResolvedValueOnce([{ // update
          ...mockProfile,
          timezone: 'Europe/London',
        }])

      const result = await userProfileRepository.updateTimezone('user-123', 'Europe/London')

      expect(result?.timezone).toBe('Europe/London')
    })
  })

  describe('updateLanguage', () => {
    it('should update preferred language', async () => {
      // Mock finding existing profile
      mockDb.query
        .mockResolvedValueOnce([mockProfile]) // findByUserId
        .mockResolvedValueOnce([{ // update
          ...mockProfile,
          preferred_language: 'es',
        }])

      const result = await userProfileRepository.updateLanguage('user-123', 'es')

      expect(result?.preferredLanguage).toBe('es')
    })
  })

  describe('findByTimezone', () => {
    it('should find profiles by timezone', async () => {
      mockDb.query.mockResolvedValue([mockProfile])

      const result = await userProfileRepository.findByTimezone('America/New_York')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE timezone = $1'),
        ['America/New_York']
      )
      expect(result).toHaveLength(1)
      expect(result[0].timezone).toBe('America/New_York')
    })
  })

  describe('findByLanguage', () => {
    it('should find profiles by language', async () => {
      mockDb.query.mockResolvedValue([mockProfile])

      const result = await userProfileRepository.findByLanguage('en')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE preferred_language = $1'),
        ['en']
      )
      expect(result).toHaveLength(1)
      expect(result[0].preferredLanguage).toBe('en')
    })
  })

  describe('findIncompleteOnboarding', () => {
    it('should find profiles with incomplete onboarding', async () => {
      const incompleteProfile = { ...mockProfile, onboarding_completed: false }
      mockDb.query.mockResolvedValue([incompleteProfile])

      const result = await userProfileRepository.findIncompleteOnboarding()

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE onboarding_completed = $1'),
        [false]
      )
      expect(result).toHaveLength(1)
      expect(result[0].onboardingCompleted).toBe(false)
    })

    it('should find profiles older than specified days', async () => {
      const incompleteProfile = { ...mockProfile, onboarding_completed: false }
      mockDb.query.mockResolvedValue([incompleteProfile])

      const result = await userProfileRepository.findIncompleteOnboarding({ olderThanDays: 7 })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE onboarding_completed = false AND created_at <= $1'),
        expect.arrayContaining([expect.any(Date)])
      )
      expect(result).toHaveLength(1)
    })
  })

  describe('getStatistics', () => {
    it('should return profile statistics', async () => {
      mockDb.query
        .mockResolvedValueOnce([{ count: '100' }]) // total
        .mockResolvedValueOnce([{ count: '85' }])  // completed onboarding
        .mockResolvedValueOnce([                   // by language
          { preferred_language: 'en', count: '70' },
          { preferred_language: 'es', count: '20' },
          { preferred_language: 'fr', count: '10' },
        ])
        .mockResolvedValueOnce([                   // by timezone
          { timezone: 'America/New_York', count: '30' },
          { timezone: 'Europe/London', count: '25' },
          { timezone: 'Asia/Tokyo', count: '20' },
        ])

      const stats = await userProfileRepository.getStatistics()

      expect(stats).toEqual({
        total: 100,
        completedOnboarding: 85,
        byLanguage: {
          en: 70,
          es: 20,
          fr: 10,
        },
        byTimezone: {
          'America/New_York': 30,
          'Europe/London': 25,
          'Asia/Tokyo': 20,
        },
      })
    })
  })
})