import { UserRepository } from '../user-repository'
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

describe('UserRepository', () => {
  let mockDb: any
  let userRepository: UserRepository

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn(),
    }
    
    ;(getDatabase as jest.Mock).mockReturnValue(mockDb)
    
    userRepository = new UserRepository()
  })

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    oauth_provider: 'google',
    oauth_id: 'google123',
    organization_id: null,
    subscription_tier: 'free',
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    last_active_at: new Date('2024-01-01T12:00:00Z'),
    is_active: true,
  }

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      mockDb.query.mockResolvedValue([mockUser])

      const result = await userRepository.findByEmail('test@example.com')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE email = $1'),
        ['test@example.com']
      )
      expect(result?.email).toBe('test@example.com')
    })

    it('should return null when user not found', async () => {
      mockDb.query.mockResolvedValue([])

      const result = await userRepository.findByEmail('nonexistent@example.com')

      expect(result).toBeNull()
    })
  })

  describe('findByOAuth', () => {
    it('should find user by OAuth provider and ID', async () => {
      mockDb.query.mockResolvedValue([mockUser])

      const result = await userRepository.findByOAuth('google', 'google123')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE oauth_provider = $1 AND oauth_id = $2'),
        ['google', 'google123']
      )
      expect(result?.oauthProvider).toBe('google')
      expect(result?.oauthId).toBe('google123')
    })

    it('should return null when OAuth user not found', async () => {
      mockDb.query.mockResolvedValue([])

      const result = await userRepository.findByOAuth('google', 'nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('findByOrganization', () => {
    it('should find users by organization ID', async () => {
      const orgUser = { ...mockUser, organization_id: '456e7890-e89b-12d3-a456-426614174001' }
      mockDb.query.mockResolvedValue([orgUser])

      const result = await userRepository.findByOrganization('456e7890-e89b-12d3-a456-426614174001')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE organization_id = $1 AND is_active = $2'),
        ['456e7890-e89b-12d3-a456-426614174001', true]
      )
      expect(result).toHaveLength(1)
      expect(result[0].organizationId).toBe('456e7890-e89b-12d3-a456-426614174001')
    })

    it('should include inactive users when requested', async () => {
      const inactiveUser = { ...mockUser, is_active: false, organization_id: '456e7890-e89b-12d3-a456-426614174001' }
      mockDb.query.mockResolvedValue([inactiveUser])

      await userRepository.findByOrganization('456e7890-e89b-12d3-a456-426614174001', { includeInactive: true })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE organization_id = $1'),
        ['456e7890-e89b-12d3-a456-426614174001']
      )
    })

    it('should handle pagination options', async () => {
      mockDb.query.mockResolvedValue([mockUser])

      await userRepository.findByOrganization('456e7890-e89b-12d3-a456-426614174001', { limit: 10, offset: 20 })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $3'),
        ['456e7890-e89b-12d3-a456-426614174001', true, 10, 20]
      )
    })
  })

  describe('findBySubscriptionTier', () => {
    it('should find users by subscription tier', async () => {
      const premiumUser = { ...mockUser, subscription_tier: 'premium' }
      mockDb.query.mockResolvedValue([premiumUser])

      const result = await userRepository.findBySubscriptionTier('premium')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE subscription_tier = $1'),
        ['premium']
      )
      expect(result[0].subscriptionTier).toBe('premium')
    })
  })

  describe('updateLastActive', () => {
    it('should update user last active timestamp', async () => {
      const updatedUser = { ...mockUser, last_active_at: new Date() }
      mockDb.query.mockResolvedValue([updatedUser])

      const result = await userRepository.updateLastActive('123e4567-e89b-12d3-a456-426614174000')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining(['123e4567-e89b-12d3-a456-426614174000'])
      )
      expect(result?.lastActiveAt).toBeInstanceOf(Date)
    })
  })

  describe('updateSubscriptionTier', () => {
    it('should update user subscription tier', async () => {
      const updatedUser = { ...mockUser, subscription_tier: 'premium' }
      mockDb.query.mockResolvedValue([updatedUser])

      const result = await userRepository.updateSubscriptionTier(
        '123e4567-e89b-12d3-a456-426614174000',
        'premium'
      )

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining(['123e4567-e89b-12d3-a456-426614174000', 'premium'])
      )
      expect(result?.subscriptionTier).toBe('premium')
    })
  })

  describe('deactivate', () => {
    it('should deactivate user account', async () => {
      const deactivatedUser = { ...mockUser, is_active: false }
      mockDb.query.mockResolvedValue([deactivatedUser])

      const result = await userRepository.deactivate('123e4567-e89b-12d3-a456-426614174000')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining(['123e4567-e89b-12d3-a456-426614174000', false])
      )
      expect(result?.isActive).toBe(false)
    })
  })

  describe('reactivate', () => {
    it('should reactivate user account', async () => {
      const reactivatedUser = { ...mockUser, is_active: true }
      mockDb.query.mockResolvedValue([reactivatedUser])

      const result = await userRepository.reactivate('123e4567-e89b-12d3-a456-426614174000')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining(['123e4567-e89b-12d3-a456-426614174000', true])
      )
      expect(result?.isActive).toBe(true)
    })
  })

  describe('getStatistics', () => {
    it('should return user statistics', async () => {
      // Mock multiple count queries
      mockDb.query
        .mockResolvedValueOnce([{ count: '100' }]) // total
        .mockResolvedValueOnce([{ count: '95' }])  // active
        .mockResolvedValueOnce([{ count: '60' }])  // free
        .mockResolvedValueOnce([{ count: '30' }])  // premium
        .mockResolvedValueOnce([{ count: '10' }])  // enterprise
        .mockResolvedValueOnce([{ count: '50' }])  // google
        .mockResolvedValueOnce([{ count: '25' }])  // microsoft
        .mockResolvedValueOnce([{ count: '15' }])  // apple
        .mockResolvedValueOnce([{ count: '10' }])  // meta

      const stats = await userRepository.getStatistics()

      expect(stats).toEqual({
        total: 100,
        active: 95,
        byTier: {
          free: 60,
          premium: 30,
          enterprise: 10,
        },
        byProvider: {
          google: 50,
          microsoft: 25,
          apple: 15,
          meta: 10,
        },
      })
    })
  })

  describe('findRecentlyActive', () => {
    it('should find recently active users', async () => {
      mockDb.query.mockResolvedValue([mockUser])

      const result = await userRepository.findRecentlyActive(7, { limit: 10 })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE last_active_at >= $1'),
        expect.arrayContaining([expect.any(Date), 10])
      )
      expect(result).toHaveLength(1)
    })

    it('should use default 30 days when no days specified', async () => {
      mockDb.query.mockResolvedValue([])

      await userRepository.findRecentlyActive()

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE last_active_at >= $1'),
        expect.arrayContaining([expect.any(Date)])
      )
    })
  })
})