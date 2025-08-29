import { z } from 'zod'

// Validation schemas using Zod

/**
 * Zod validation schema for User entity
 * Validates user data structure including authentication, subscription, and activity status
 */
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  oauthProvider: z.string(),
  oauthId: z.string(),
  organizationId: z.string().uuid().optional().nullable(),
  subscriptionTier: z.enum(['free', 'premium', 'enterprise']),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastActiveAt: z.date().optional().nullable(),
  isActive: z.boolean(),
})

/**
 * Zod validation schema for AttentionScore entity
 * Validates attention assessment results with scores for different attention types
 */
export const AttentionScoreSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  overallScore: z.number().min(1).max(100),
  sustainedAttention: z.number().min(1).max(100),
  selectiveAttention: z.number().min(1).max(100),
  dividedAttention: z.number().min(1).max(100),
  executiveAttention: z.number().min(1).max(100),
  assessmentData: z.record(z.unknown()),
  calculatedAt: z.date(),
})

/**
 * Zod validation schema for UserProfile entity
 * Validates user profile data including preferences and settings
 */
export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  displayName: z.string().max(100).optional().nullable(),
  timezone: z.string().default('UTC'),
  preferredLanguage: z.string().min(2).max(10).default('en'),
  privacySettings: z.record(z.unknown()).default({}),
  notificationPreferences: z.record(z.unknown()).default({}),
  onboardingCompleted: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * Zod validation schema for Organization entity
 * Validates organization data for enterprise customers
 */
export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  domain: z.string().max(255).optional().nullable(),
  subscriptionPlan: z.enum(['enterprise', 'education']),
  maxUsers: z.number().positive().default(50),
  billingEmail: z.string().email().optional().nullable(),
  adminUserId: z.string().uuid().optional().nullable(),
  settings: z.record(z.unknown()).default({}),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * Zod validation schema for Challenge entity
 * Validates challenge definitions including metadata, instructions, and success criteria
 */
export const ChallengeSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['pomodoro', 'distraction_drill', 'real_life_task', 'custom']),
  title: z.string().min(1).max(200),
  description: z.string(),
  difficulty: z.number().min(1).max(5),
  estimatedDuration: z.number().positive(),
  instructions: z.array(z.string()),
  successCriteria: z.record(z.unknown()),
  rewards: z.record(z.unknown()),
  isActive: z.boolean(),
  createdBy: z.enum(['system', 'kiro']),
  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * Zod validation schema for ChallengeSession entity
 * Validates challenge session data including progress and performance metrics
 */
export const ChallengeSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  challengeId: z.string().uuid(),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  status: z.enum(['in_progress', 'completed', 'abandoned']),
  performanceScore: z.number().min(0).max(100).optional(),
  sessionData: z.record(z.unknown()),
  biometricInsights: z.record(z.unknown()).optional(),
  distractionEvents: z.record(z.unknown()),
  completionTime: z.number().positive().optional(),
})

/** TypeScript type inferred from UserSchema for type safety */
export type User = z.infer<typeof UserSchema>

/** TypeScript type inferred from UserProfileSchema for type safety */
export type UserProfile = z.infer<typeof UserProfileSchema>

/** TypeScript type inferred from OrganizationSchema for type safety */
export type Organization = z.infer<typeof OrganizationSchema>

/** TypeScript type inferred from AttentionScoreSchema for type safety */
export type AttentionScore = z.infer<typeof AttentionScoreSchema>

/** TypeScript type inferred from ChallengeSchema for type safety */
export type Challenge = z.infer<typeof ChallengeSchema>

/** TypeScript type inferred from ChallengeSessionSchema for type safety */
export type ChallengeSession = z.infer<typeof ChallengeSessionSchema>