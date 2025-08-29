// Core type definitions

/**
 * Core user entity representing a registered user in the Focus Training Academy
 * Contains authentication details, subscription information, and activity status
 */
export interface User {
  /** Unique identifier for the user */
  id: string
  /** User's email address */
  email: string
  /** OAuth provider used for authentication (google, microsoft, apple, meta) */
  oauthProvider: string
  /** Unique identifier from the OAuth provider */
  oauthId: string
  /** Optional organization ID for enterprise users */
  organizationId?: string
  /** User's subscription tier determining feature access */
  subscriptionTier: 'free' | 'premium' | 'enterprise'
  /** Timestamp when the user account was created */
  createdAt: Date
  /** Timestamp when the user account was last updated */
  updatedAt: Date
  /** Optional timestamp of user's last activity */
  lastActiveAt?: Date
  /** Whether the user account is active */
  isActive: boolean
}

/**
 * Extended user profile containing personalization settings and preferences
 * Linked to a User entity via userId foreign key
 */
export interface UserProfile {
  /** Unique identifier for the user profile */
  id: string
  /** Foreign key reference to the User entity */
  userId: string
  /** Optional display name chosen by the user */
  displayName?: string
  /** User's timezone for scheduling and notifications */
  timezone?: string
  /** User's preferred language for localization */
  preferredLanguage: string
  /** Privacy settings configuration object */
  privacySettings: Record<string, unknown>
  /** Notification preferences configuration object */
  notificationPreferences: Record<string, unknown>
  /** Whether the user has completed the onboarding process */
  onboardingCompleted: boolean
  /** Timestamp when the profile was created */
  createdAt: Date
  /** Timestamp when the profile was last updated */
  updatedAt: Date
}

/**
 * Attention assessment results containing scores for different attention types
 * Generated from cognitive assessments and used for personalized training plans
 */
export interface AttentionScore {
  /** Unique identifier for the attention score record */
  id: string
  /** Foreign key reference to the User entity */
  userId: string
  /** Weighted overall attention score (1-100) */
  overallScore: number
  /** Score for sustained attention ability (1-100) */
  sustainedAttention: number
  /** Score for selective attention ability (1-100) */
  selectiveAttention: number
  /** Score for divided attention ability (1-100) */
  dividedAttention: number
  /** Score for executive attention ability (1-100) */
  executiveAttention: number
  /** Raw assessment data and metrics */
  assessmentData: Record<string, unknown>
  /** Timestamp when the scores were calculated */
  calculatedAt: Date
}

/**
 * Challenge definition containing all metadata and configuration for a focus training exercise
 * Can be system-generated or created by Kiro AI for personalized training
 */
export interface Challenge {
  /** Unique identifier for the challenge */
  id: string
  /** Type of challenge determining the training methodology */
  type: 'pomodoro' | 'distraction_drill' | 'real_life_task' | 'custom'
  /** Display title of the challenge */
  title: string
  /** Detailed description of the challenge purpose and goals */
  description: string
  /** Difficulty level from 1 (easiest) to 5 (hardest) */
  difficulty: 1 | 2 | 3 | 4 | 5
  /** Estimated duration in seconds to complete the challenge */
  estimatedDuration: number
  /** Step-by-step instructions for completing the challenge */
  instructions: string[]
  /** Criteria that define successful completion */
  successCriteria: Record<string, unknown>
  /** Points, badges, or other rewards for completion */
  rewards: Record<string, unknown>
  /** Whether the challenge is currently available to users */
  isActive: boolean
  /** Source that created this challenge */
  createdBy: 'system' | 'kiro'
  /** Timestamp when the challenge was created */
  createdAt: Date
  /** Timestamp when the challenge was last updated */
  updatedAt: Date
}

/**
 * Organization entity for enterprise customers and educational institutions
 * Contains subscription details, user limits, and administrative settings
 */
export interface Organization {
  /** Unique identifier for the organization */
  id: string
  /** Organization display name */
  name: string
  /** Optional email domain for automatic user assignment */
  domain?: string
  /** Organization subscription plan type */
  subscriptionPlan: 'enterprise' | 'education'
  /** Maximum number of users allowed in the organization */
  maxUsers: number
  /** Email address for billing and administrative communications */
  billingEmail?: string
  /** Primary administrator user for the organization */
  adminUserId?: string
  /** Organization-specific configuration and preferences */
  settings: Record<string, unknown>
  /** Whether the organization subscription is active */
  isActive: boolean
  /** Timestamp when the organization was created */
  createdAt: Date
  /** Timestamp when the organization was last updated */
  updatedAt: Date
}

/**
 * Active or completed challenge session tracking user's progress and performance
 * Contains real-time data, biometric insights, and completion metrics
 */
export interface ChallengeSession {
  /** Unique identifier for the challenge session */
  id: string
  /** Foreign key reference to the User entity */
  userId: string
  /** Foreign key reference to the Challenge entity */
  challengeId: string
  /** Timestamp when the session was started */
  startedAt: Date
  /** Optional timestamp when the session was completed */
  completedAt?: Date
  /** Current status of the challenge session */
  status: 'in_progress' | 'completed' | 'abandoned'
  /** Optional performance score (1-100) based on completion quality */
  performanceScore?: number
  /** Session-specific data and user interactions */
  sessionData: Record<string, unknown>
  /** Optional biometric insights processed client-side */
  biometricInsights?: Record<string, unknown>
  /** Recorded distraction events during the session */
  distractionEvents: Record<string, unknown>
  /** Optional actual time taken to complete in seconds */
  completionTime?: number
}