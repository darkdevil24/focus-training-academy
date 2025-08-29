import { formatDuration, calculateAttentionScore } from './index'

describe('Utility Functions', () => {
  describe('formatDuration', () => {
    it('should format seconds correctly', () => {
      expect(formatDuration(30)).toBe('30s')
      expect(formatDuration(90)).toBe('1m 30s')
      expect(formatDuration(3661)).toBe('1h 1m 1s')
    })
  })

  describe('calculateAttentionScore', () => {
    it('should calculate weighted average correctly', () => {
      const score = calculateAttentionScore(80, 70, 60, 90)
      expect(score).toBe(75) // Weighted average: 80*0.3 + 70*0.25 + 60*0.2 + 90*0.25 = 75
    })

    it('should handle edge cases', () => {
      expect(calculateAttentionScore(100, 100, 100, 100)).toBe(100)
      expect(calculateAttentionScore(1, 1, 1, 1)).toBe(1)
    })
  })
})