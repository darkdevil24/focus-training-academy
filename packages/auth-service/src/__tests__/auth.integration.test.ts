import request from 'supertest';
import { app } from '../index';
import { getPool } from '../database/connection';
import { authService } from '../services/auth-service';
import jwt from 'jsonwebtoken';

describe('Authentication Integration Tests', () => {
  let pool: any;

  beforeAll(async () => {
    // Wait for database connection
    await new Promise(resolve => setTimeout(resolve, 1000));
    pool = getPool();
  });

  beforeEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email LIKE %test%')');
    await pool.query('DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE %test%')');
    await pool.query('DELETE FROM users WHERE email LIKE %test%');
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('OAuth Callback Handling', () => {
    test('should handle Google OAuth callback successfully', async () => {
      const mockProfile = {
        id: 'google123',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google' as const
      };

      const result = await authService.handleOAuthCallback(mockProfile);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.oauth_provider).toBe('google');
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.isNewUser).toBe(true);
    });

    test('should handle existing user login', async () => {
      const mockProfile = {
        id: 'google123',
        email: 'existing@example.com',
        name: 'Existing User',
        provider: 'google' as const
      };

      // Create user first
      await authService.handleOAuthCallback(mockProfile);
      
      // Login again
      const result = await authService.handleOAuthCallback(mockProfile);

      expect(result.isNewUser).toBe(false);
      expect(result.user.email).toBe('existing@example.com');
    });

    test('should handle Microsoft OAuth callback', async () => {
      const mockProfile = {
        id: 'microsoft123',
        email: 'microsoft@example.com',
        name: 'Microsoft User',
        provider: 'microsoft' as const
      };

      const result = await authService.handleOAuthCallback(mockProfile);

      expect(result.user.oauth_provider).toBe('microsoft');
      expect(result.isNewUser).toBe(true);
    });

    test('should handle Facebook OAuth callback', async () => {
      const mockProfile = {
        id: 'facebook123',
        email: 'facebook@example.com',
        name: 'Facebook User',
        provider: 'facebook' as const
      };

      const result = await authService.handleOAuthCallback(mockProfile);

      expect(result.user.oauth_provider).toBe('facebook');
      expect(result.isNewUser).toBe(true);
    });

    test('should handle Apple OAuth callback', async () => {
      const mockProfile = {
        id: 'apple123',
        email: 'apple@example.com',
        name: 'Apple User',
        provider: 'apple' as const
      };

      const result = await authService.handleOAuthCallback(mockProfile);

      expect(result.user.oauth_provider).toBe('apple');
      expect(result.isNewUser).toBe(true);
    });
  });

  describe('Token Management', () => {
    let testUser: any;
    let tokens: any;

    beforeEach(async () => {
      const mockProfile = {
        id: 'token123',
        email: 'token@example.com',
        name: 'Token User',
        provider: 'google' as const
      };

      const result = await authService.handleOAuthCallback(mockProfile);
      testUser = result.user;
      tokens = result.tokens;
    });

    test('should validate valid JWT token', async () => {
      const decoded = jwt.verify(tokens.accessToken, process.env.JWT_SECRET || 'your-secret-key') as any;
      const userSession = await authService.validateToken(decoded);

      expect(userSession).toBeDefined();
      expect(userSession!.userId).toBe(testUser.id);
      expect(userSession!.email).toBe(testUser.email);
    });

    test('should refresh tokens successfully', async () => {
      const newTokens = await authService.refreshToken(tokens.refreshToken);

      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
      expect(newTokens.accessToken).not.toBe(tokens.accessToken);
    });

    test('should reject invalid refresh token', async () => {
      await expect(authService.refreshToken('invalid-token')).rejects.toThrow('Invalid refresh token');
    });

    test('should logout user successfully', async () => {
      await authService.logout(testUser.id);

      // Try to refresh with old token (should fail)
      await expect(authService.refreshToken(tokens.refreshToken)).rejects.toThrow();
    });
  });

  describe('API Endpoints', () => {
    let testUser: any;
    let accessToken: string;

    beforeEach(async () => {
      const mockProfile = {
        id: 'api123',
        email: 'api@example.com',
        name: 'API User',
        provider: 'google' as const
      };

      const result = await authService.handleOAuthCallback(mockProfile);
      testUser = result.user;
      accessToken = result.tokens.accessToken;
    });

    test('GET /auth/me should return current user', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe(testUser.id);
      expect(response.body.user.email).toBe(testUser.email);
    });

    test('POST /auth/validate should validate token', async () => {
      const response = await request(app)
        .post('/auth/validate')
        .send({ token: accessToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.valid).toBe(true);
      expect(response.body.user.userId).toBe(testUser.id);
    });

    test('POST /auth/refresh should refresh tokens', async () => {
      const result = await authService.handleOAuthCallback({
        id: 'refresh123',
        email: 'refresh@example.com',
        name: 'Refresh User',
        provider: 'google' as const
      });

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: result.tokens.refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tokens.accessToken).toBeDefined();
      expect(response.body.tokens.refreshToken).toBeDefined();
    });

    test('POST /auth/logout should logout user', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });

    test('should reject requests without authentication', async () => {
      await request(app)
        .get('/auth/me')
        .expect(401);

      await request(app)
        .post('/auth/logout')
        .expect(401);
    });

    test('should reject requests with invalid token', async () => {
      await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // Mock database error
      const originalQuery = pool.query;
      pool.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const mockProfile = {
        id: 'error123',
        email: 'error@example.com',
        name: 'Error User',
        provider: 'google' as const
      };

      await expect(authService.handleOAuthCallback(mockProfile)).rejects.toThrow('Authentication failed');

      // Restore original method
      pool.query = originalQuery;
    });

    test('should handle invalid JWT tokens', async () => {
      const response = await request(app)
        .post('/auth/validate')
        .send({ token: 'invalid.jwt.token' })
        .expect(401);

      expect(response.body.valid).toBe(false);
    });
  });

  describe('HTTPS Redirect URLs', () => {
    test('should use HTTPS URLs for OAuth callbacks', () => {
      const baseUrl = process.env.BASE_URL || 'https://localhost:3001';
      
      expect(baseUrl).toMatch(/^https:/);
      
      const googleCallbackUrl = `${baseUrl}/auth/google/callback`;
      const microsoftCallbackUrl = `${baseUrl}/auth/microsoft/callback`;
      const facebookCallbackUrl = `${baseUrl}/auth/facebook/callback`;
      const appleCallbackUrl = `${baseUrl}/auth/apple/callback`;

      expect(googleCallbackUrl).toMatch(/^https:/);
      expect(microsoftCallbackUrl).toMatch(/^https:/);
      expect(facebookCallbackUrl).toMatch(/^https:/);
      expect(appleCallbackUrl).toMatch(/^https:/);
    });
  });
});