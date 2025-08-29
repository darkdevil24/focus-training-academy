import { authService } from '../services/auth-service';
import { getPool, getRedis } from '../database/connection';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../database/connection');
jest.mock('jsonwebtoken');

const mockPool = {
  query: jest.fn(),
};

const mockRedis = {
  setex: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
};

(getPool as jest.Mock).mockReturnValue(mockPool);
(getRedis as jest.Mock).mockReturnValue(mockRedis);

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleOAuthCallback', () => {
    const mockProfile = {
      id: 'oauth123',
      email: 'test@example.com',
      name: 'Test User',
      provider: 'google' as const
    };

    test('should create new user for first-time OAuth login', async () => {
      // Mock no existing user
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // Check existing user
        .mockResolvedValueOnce({ // Insert new user
          rows: [{
            id: 'user123',
            email: 'test@example.com',
            oauth_provider: 'google',
            oauth_id: 'oauth123',
            subscription_tier: 'free',
            created_at: new Date(),
            updated_at: new Date(),
            is_active: true
          }]
        })
        .mockResolvedValueOnce({ rows: [] }); // Insert user profile

      (jwt.sign as jest.Mock).mockReturnValue('mock-token');
      mockRedis.setex.mockResolvedValue('OK');

      const result = await authService.handleOAuthCallback(mockProfile);

      expect(result.isNewUser).toBe(true);
      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens.accessToken).toBe('mock-token');
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });

    test('should update existing user for returning OAuth login', async () => {
      const existingUser = {
        id: 'user123',
        email: 'test@example.com',
        oauth_provider: 'google',
        oauth_id: 'oauth123',
        subscription_tier: 'free',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true
      };

      // Mock existing user
      mockPool.query
        .mockResolvedValueOnce({ rows: [existingUser] }) // Check existing user
        .mockResolvedValueOnce({ rows: [] }); // Update last active

      (jwt.sign as jest.Mock).mockReturnValue('mock-token');
      mockRedis.setex.mockResolvedValue('OK');

      const result = await authService.handleOAuthCallback(mockProfile);

      expect(result.isNewUser).toBe(false);
      expect(result.user.id).toBe('user123');
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    test('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      await expect(authService.handleOAuthCallback(mockProfile)).rejects.toThrow('Authentication failed');
    });
  });

  describe('generateTokens', () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      oauth_provider: 'google',
      oauth_id: 'oauth123',
      subscription_tier: 'free',
      organization_id: null,
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true
    };

    test('should generate access and refresh tokens', async () => {
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      
      mockRedis.setex.mockResolvedValue('OK');

      const tokens = await authService.generateTokens(mockUser);

      expect(tokens.accessToken).toBe('access-token');
      expect(tokens.refreshToken).toBe('refresh-token');
      expect(tokens.expiresIn).toBe(3600);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        `refresh_token:${mockUser.id}`,
        7 * 24 * 60 * 60,
        'refresh-token'
      );
    });
  });

  describe('validateToken', () => {
    const mockPayload = {
      userId: 'user123',
      email: 'test@example.com',
      roles: [],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };

    test('should validate token and return user session', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        roles: ['user'],
        organization_id: null
      };

      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      const session = await authService.validateToken(mockPayload);

      expect(session).toBeDefined();
      expect(session!.userId).toBe('user123');
      expect(session!.email).toBe('test@example.com');
    });

    test('should return null for non-existent user', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const session = await authService.validateToken(mockPayload);

      expect(session).toBeNull();
    });

    test('should handle database errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      const session = await authService.validateToken(mockPayload);

      expect(session).toBeNull();
    });
  });

  describe('refreshToken', () => {
    test('should refresh valid token', async () => {
      const mockDecoded = {
        userId: 'user123',
        type: 'refresh'
      };

      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        oauth_provider: 'google',
        oauth_id: 'oauth123',
        subscription_tier: 'free',
        organization_id: null,
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);
      mockRedis.get.mockResolvedValue('valid-refresh-token');
      mockPool.query.mockResolvedValue({ rows: [mockUser] });
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      mockRedis.setex.mockResolvedValue('OK');

      const tokens = await authService.refreshToken('valid-refresh-token');

      expect(tokens.accessToken).toBe('new-access-token');
      expect(tokens.refreshToken).toBe('new-refresh-token');
    });

    test('should reject invalid refresh token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshToken('invalid-token')).rejects.toThrow('Invalid refresh token');
    });

    test('should reject token not in Redis', async () => {
      const mockDecoded = {
        userId: 'user123',
        type: 'refresh'
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);
      mockRedis.get.mockResolvedValue(null);

      await expect(authService.refreshToken('token-not-in-redis')).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    test('should logout user successfully', async () => {
      mockRedis.del.mockResolvedValue(1);
      mockPool.query.mockResolvedValue({ rows: [] });

      await authService.logout('user123');

      expect(mockRedis.del).toHaveBeenCalledWith('refresh_token:user123');
      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE users SET last_active_at = NOW() WHERE id = $1',
        ['user123']
      );
    });

    test('should handle logout errors', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      await expect(authService.logout('user123')).rejects.toThrow('Logout failed');
    });
  });

  describe('getUserById', () => {
    test('should return user by ID', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com'
      };

      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      const user = await authService.getUserById('user123');

      expect(user).toEqual(mockUser);
    });

    test('should return null for non-existent user', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const user = await authService.getUserById('nonexistent');

      expect(user).toBeNull();
    });

    test('should handle database errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      const user = await authService.getUserById('user123');

      expect(user).toBeNull();
    });
  });
});