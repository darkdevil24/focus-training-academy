// Utility functions

/**
 * Converts seconds to a human-readable duration string
 * @param seconds - The number of seconds to format
 * @returns Formatted duration string like '1h 2m 30s', '5m 45s', or '30s'
 * @example
 * formatDuration(3661) // Returns '1h 1m 1s'
 * formatDuration(125) // Returns '2m 5s'
 * formatDuration(45) // Returns '45s'
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${remainingSeconds}s`
}

/**
 * Calculates a weighted overall attention score from individual attention metrics
 * Uses predefined weights: sustained (30%), selective (25%), divided (20%), executive (25%)
 * @param sustainedAttention - Score for sustained attention (1-100)
 * @param selectiveAttention - Score for selective attention (1-100)
 * @param dividedAttention - Score for divided attention (1-100)
 * @param executiveAttention - Score for executive attention (1-100)
 * @returns Weighted overall attention score rounded to nearest integer (1-100)
 */
export const calculateAttentionScore = (
  sustainedAttention: number,
  selectiveAttention: number,
  dividedAttention: number,
  executiveAttention: number
): number => {
  // Weighted average calculation
  const weights = {
    sustained: 0.3,
    selective: 0.25,
    divided: 0.2,
    executive: 0.25,
  }

  return Math.round(
    sustainedAttention * weights.sustained +
      selectiveAttention * weights.selective +
      dividedAttention * weights.divided +
      executiveAttention * weights.executive
  )
}

/**
 * Generates a cryptographically secure UUID v4 string
 * @returns A unique identifier string in UUID format
 * @example
 * generateId() // Returns '550e8400-e29b-41d4-a716-446655440000'
 */
export const generateId = (): string => {
  return crypto.randomUUID()
}