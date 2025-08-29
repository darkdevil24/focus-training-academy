// Repository exports
export { BaseRepository } from './base-repository'
export { UserRepository } from './user-repository'
export { UserProfileRepository } from './user-profile-repository'
export { OrganizationRepository } from './organization-repository'

// Repository instances (singletons)
let userRepository: UserRepository | null = null
let userProfileRepository: UserProfileRepository | null = null
let organizationRepository: OrganizationRepository | null = null

/**
 * Get UserRepository singleton instance
 */
export function getUserRepository(): UserRepository {
  if (!userRepository) {
    userRepository = new UserRepository()
  }
  return userRepository
}

/**
 * Get UserProfileRepository singleton instance
 */
export function getUserProfileRepository(): UserProfileRepository {
  if (!userProfileRepository) {
    userProfileRepository = new UserProfileRepository()
  }
  return userProfileRepository
}

/**
 * Get OrganizationRepository singleton instance
 */
export function getOrganizationRepository(): OrganizationRepository {
  if (!organizationRepository) {
    organizationRepository = new OrganizationRepository()
  }
  return organizationRepository
}

/**
 * Initialize all repositories (useful for testing)
 */
export function initializeRepositories(): void {
  getUserRepository()
  getUserProfileRepository()
  getOrganizationRepository()
}

/**
 * Reset repository instances (useful for testing)
 */
export function resetRepositories(): void {
  userRepository = null
  userProfileRepository = null
  organizationRepository = null
}