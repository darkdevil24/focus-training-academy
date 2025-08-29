import { OrganizationRepository } from '../organization-repository'
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

describe('OrganizationRepository', () => {
  let mockDb: any
  let organizationRepository: OrganizationRepository

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockDb = {
      query: jest.fn(),
      transaction: jest.fn(),
    }
    
    ;(getDatabase as jest.Mock).mockReturnValue(mockDb)
    
    organizationRepository = new OrganizationRepository()
  })

  const mockOrganization = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Acme Corporation',
    domain: 'acme.com',
    subscription_plan: 'enterprise',
    max_users: 100,
    billing_email: 'billing@acme.com',
    admin_user_id: '456e7890-e89b-12d3-a456-426614174001',
    settings: {
      ssoEnabled: true,
      customBranding: true,
    },
    is_active: true,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  }

  describe('findByDomain', () => {
    it('should find organization by domain', async () => {
      mockDb.query.mockResolvedValue([mockOrganization])

      const result = await organizationRepository.findByDomain('acme.com')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE domain = $1'),
        ['acme.com']
      )
      expect(result?.domain).toBe('acme.com')
      expect(result?.name).toBe('Acme Corporation')
    })

    it('should return null when organization not found', async () => {
      mockDb.query.mockResolvedValue([])

      const result = await organizationRepository.findByDomain('nonexistent.com')

      expect(result).toBeNull()
    })
  })

  describe('findBySubscriptionPlan', () => {
    it('should find organizations by subscription plan', async () => {
      mockDb.query.mockResolvedValue([mockOrganization])

      const result = await organizationRepository.findBySubscriptionPlan('enterprise')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE subscription_plan = $1 AND is_active = $2'),
        ['enterprise', true]
      )
      expect(result).toHaveLength(1)
      expect(result[0].subscriptionPlan).toBe('enterprise')
    })

    it('should include inactive organizations when requested', async () => {
      const inactiveOrg = { ...mockOrganization, is_active: false }
      mockDb.query.mockResolvedValue([inactiveOrg])

      await organizationRepository.findBySubscriptionPlan('enterprise', { includeInactive: true })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE subscription_plan = $1'),
        ['enterprise']
      )
    })
  })

  describe('findByAdminUser', () => {
    it('should find organizations by admin user ID', async () => {
      mockDb.query.mockResolvedValue([mockOrganization])

      const result = await organizationRepository.findByAdminUser('456e7890-e89b-12d3-a456-426614174001')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE admin_user_id = $1'),
        ['456e7890-e89b-12d3-a456-426614174001']
      )
      expect(result).toHaveLength(1)
      expect(result[0].adminUserId).toBe('456e7890-e89b-12d3-a456-426614174001')
    })
  })

  describe('updateSettings', () => {
    it('should update organization settings', async () => {
      // Mock finding existing organization
      mockDb.query
        .mockResolvedValueOnce([mockOrganization]) // findById
        .mockResolvedValueOnce([{ // update
          ...mockOrganization,
          settings: {
            ...mockOrganization.settings,
            newSetting: 'value',
          }
        }])

      const newSettings = { newSetting: 'value' }
      const result = await organizationRepository.updateSettings('123e4567-e89b-12d3-a456-426614174000', newSettings)

      expect(result?.settings.newSetting).toBe('value')
      expect(result?.settings.ssoEnabled).toBe(true) // Existing setting preserved
    })

    it('should return null when organization not found', async () => {
      mockDb.query.mockResolvedValueOnce([]) // findById returns empty

      const result = await organizationRepository.updateSettings('nonexistent-id', {})

      expect(result).toBeNull()
    })
  })

  describe('updateMaxUsers', () => {
    it('should update max users limit', async () => {
      const updatedOrg = { ...mockOrganization, max_users: 200 }
      mockDb.query.mockResolvedValue([updatedOrg])

      const result = await organizationRepository.updateMaxUsers('123e4567-e89b-12d3-a456-426614174000', 200)

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE organizations'),
        expect.arrayContaining(['123e4567-e89b-12d3-a456-426614174000', 200])
      )
      expect(result?.maxUsers).toBe(200)
    })

    it('should throw error for invalid max users', async () => {
      await expect(
        organizationRepository.updateMaxUsers('123e4567-e89b-12d3-a456-426614174000', 0)
      ).rejects.toThrow('Max users must be greater than 0')
    })
  })

  describe('updateAdminUser', () => {
    it('should update admin user', async () => {
      const updatedOrg = { ...mockOrganization, admin_user_id: '789e0123-e89b-12d3-a456-426614174002' }
      mockDb.query.mockResolvedValue([updatedOrg])

      const result = await organizationRepository.updateAdminUser('123e4567-e89b-12d3-a456-426614174000', '789e0123-e89b-12d3-a456-426614174002')

      expect(result?.adminUserId).toBe('789e0123-e89b-12d3-a456-426614174002')
    })
  })

  describe('updateBillingEmail', () => {
    it('should update billing email', async () => {
      const updatedOrg = { ...mockOrganization, billing_email: 'newbilling@acme.com' }
      mockDb.query.mockResolvedValue([updatedOrg])

      const result = await organizationRepository.updateBillingEmail('123e4567-e89b-12d3-a456-426614174000', 'newbilling@acme.com')

      expect(result?.billingEmail).toBe('newbilling@acme.com')
    })
  })

  describe('deactivate', () => {
    it('should deactivate organization', async () => {
      const deactivatedOrg = { ...mockOrganization, is_active: false }
      mockDb.query.mockResolvedValue([deactivatedOrg])

      const result = await organizationRepository.deactivate('123e4567-e89b-12d3-a456-426614174000')

      expect(result?.isActive).toBe(false)
    })
  })

  describe('reactivate', () => {
    it('should reactivate organization', async () => {
      const reactivatedOrg = { ...mockOrganization, is_active: true }
      mockDb.query.mockResolvedValue([reactivatedOrg])

      const result = await organizationRepository.reactivate('123e4567-e89b-12d3-a456-426614174000')

      expect(result?.isActive).toBe(true)
    })
  })

  describe('findByIdWithUserCount', () => {
    it('should find organization with user count', async () => {
      const orgWithCount = { ...mockOrganization, user_count: '25' }
      mockDb.query.mockResolvedValue([orgWithCount])

      const result = await organizationRepository.findByIdWithUserCount('123e4567-e89b-12d3-a456-426614174000')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(u.id) as user_count'),
        ['123e4567-e89b-12d3-a456-426614174000']
      )
      expect(result?.userCount).toBe(25)
      expect(result?.name).toBe('Acme Corporation')
    })

    it('should return null when organization not found', async () => {
      mockDb.query.mockResolvedValue([])

      const result = await organizationRepository.findByIdWithUserCount('nonexistent-id')

      expect(result).toBeNull()
    })
  })

  describe('findAllWithUserCounts', () => {
    it('should find all organizations with user counts', async () => {
      const orgsWithCounts = [
        { ...mockOrganization, user_count: '25' },
        { ...mockOrganization, id: '789e0123-e89b-12d3-a456-426614174002', name: 'Beta Corp', user_count: '15' },
      ]
      mockDb.query.mockResolvedValue(orgsWithCounts)

      const result = await organizationRepository.findAllWithUserCounts()

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(u.id) as user_count'),
        []
      )
      expect(result).toHaveLength(2)
      expect(result[0].userCount).toBe(25)
      expect(result[1].userCount).toBe(15)
    })

    it('should handle pagination and filters', async () => {
      mockDb.query.mockResolvedValue([])

      await organizationRepository.findAllWithUserCounts({ 
        limit: 10, 
        offset: 20, 
        includeInactive: true 
      })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [10, 20]
      )
    })
  })

  describe('hasReachedUserLimit', () => {
    it('should return true when user limit reached', async () => {
      const orgAtLimit = { ...mockOrganization, user_count: '100', max_users: 100 }
      mockDb.query.mockResolvedValue([orgAtLimit])

      const result = await organizationRepository.hasReachedUserLimit('123e4567-e89b-12d3-a456-426614174000')

      expect(result).toBe(true)
    })

    it('should return false when under user limit', async () => {
      const orgUnderLimit = { ...mockOrganization, user_count: '50', max_users: 100 }
      mockDb.query.mockResolvedValue([orgUnderLimit])

      const result = await organizationRepository.hasReachedUserLimit('123e4567-e89b-12d3-a456-426614174000')

      expect(result).toBe(false)
    })

    it('should throw error when organization not found', async () => {
      mockDb.query.mockResolvedValue([])

      await expect(
        organizationRepository.hasReachedUserLimit('nonexistent-id')
      ).rejects.toThrow('Organization not found')
    })
  })

  describe('getStatistics', () => {
    it('should return organization statistics', async () => {
      mockDb.query
        .mockResolvedValueOnce([{ count: '50' }]) // total
        .mockResolvedValueOnce([{ count: '45' }]) // active
        .mockResolvedValueOnce([                  // by plan
          { subscription_plan: 'enterprise', count: '30' },
          { subscription_plan: 'education', count: '15' },
        ])
        .mockResolvedValueOnce([{                 // user stats
          total_users: '1250',
          active_orgs: '45',
        }])

      const stats = await organizationRepository.getStatistics()

      expect(stats).toEqual({
        total: 50,
        active: 45,
        byPlan: {
          enterprise: 30,
          education: 15,
        },
        totalUsers: 1250,
        averageUsersPerOrg: 28, // Math.round(1250 / 45)
      })
    })
  })

  describe('searchByName', () => {
    it('should search organizations by name', async () => {
      mockDb.query.mockResolvedValue([mockOrganization])

      const result = await organizationRepository.searchByName('Acme')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE name ILIKE $1'),
        ['%Acme%']
      )
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Acme Corporation')
    })

    it('should handle pagination in search', async () => {
      mockDb.query.mockResolvedValue([])

      await organizationRepository.searchByName('Test', { limit: 5, offset: 10 })

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2'),
        ['%Test%', 5, 10]
      )
    })
  })
})