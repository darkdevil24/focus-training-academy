import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getPool, getRedis } from '../database/connection';
import { 
  User, 
  AuthResult, 
  TokenPair, 
  OAuthProfile, 
  UserSession, 
  JWTPayload 
} from '../types/auth';
import { logger } from '../utils/logger';

class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
  private readonly REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

  async handleOAuthCallback(profile: OAuthProfile): Promise<AuthResult> {
    const pool = getPool();
    
    try {
      // Check if user exists
      const existingUserQuery = `
        SELECT * FROM users 
        WHERE oauth_provider = $1 AND oauth_id = $2
      `;
      const existingUserResult = await pool.query(existingUserQuery, [profile.provider, profile.id]);
      
      let user: User;
      let isNewUser = false;

      if (existingUserResult.rows.length > 0) {
        // Update existing user's last active time
        user = existingUserResult.rows[0];
        await pool.query(
          'UPDATE users SET last_active_at = NOW(), updated_at = NOW() WHERE id = $1',
          [user.id]
        );
      } else {
        // Create new user
        isNewUser = true;
        const userId = crypto.randomUUID();
        
        const insertUserQuery = `
          INSERT INTO users (id, email, oauth_provider, oauth_id, subscription_tier, created_at, updated_at, last_active_at, is_active)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW(), true)
          RETURNING *
        `;
        
        const newUserResult = await pool.query(insertUserQuery, [
          userId,
          profile.email,
          profile.provider,
          profile.id,
          'free'
        ]);
        
        user = newUserResult.rows[0];

        // Create user profile
        await this.createUserProfile(user.id, profile);
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);

      return {
        user,
        tokens,
        isNewUser
      };
    } catch (error) {
      logger.error('OAuth callback error:', error);
      throw new Error('Authentication failed');
    }
  }

  async generateTokens(user: User): Promise<TokenPair> {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      roles: [], // Will be populated from user roles
      organizationId: user.organization_id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN
    });

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      this.JWT_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRES_IN }
    );

    // Store refresh token in Redis
    const redis = getRedis();
    await redis.setex(`refresh_token:${user.id}`, 7 * 24 * 60 * 60, refreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600 // 1 hour in seconds
    };
  }

  async validateToken(payload: JWTPayload): Promise<UserSession | null> {
    try {
      const pool = getPool();
      
      const userQuery = `
        SELECT u.*, array_agg(DISTINCT r.name) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.id = $1 AND u.is_active = true
        GROUP BY u.id
      `;
      
      const result = await pool.query(userQuery, [payload.userId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      
      return {
        userId: user.id,
        email: user.email,
        roles: user.roles || [],
        permissions: [], // Will be populated based on roles
        organizationId: user.organization_id,
        expiresAt: new Date(payload.exp * 1000)
      };
    } catch (error) {
      logger.error('Token validation error:', error);
      return null;
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      const decoded = jwt.verify(refreshToken, this.JWT_SECRET) as any;
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      // Check if refresh token exists in Redis
      const redis = getRedis();
      const storedToken = await redis.get(`refresh_token:${decoded.userId}`);
      
      if (storedToken !== refreshToken) {
        throw new Error('Refresh token not found or expired');
      }

      // Get user and generate new tokens
      const user = await this.getUserById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      return await this.generateTokens(user);
    } catch (error) {
      logger.error('Refresh token error:', error);
      throw new Error('Invalid refresh token');
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const pool = getPool();
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Get user by ID error:', error);
      return null;
    }
  }

  async logout(userId: string): Promise<void> {
    try {
      const redis = getRedis();
      await redis.del(`refresh_token:${userId}`);
      
      // Update last active time
      const pool = getPool();
      await pool.query(
        'UPDATE users SET last_active_at = NOW() WHERE id = $1',
        [userId]
      );
    } catch (error) {
      logger.error('Logout error:', error);
      throw new Error('Logout failed');
    }
  }

  private async createUserProfile(userId: string, profile: OAuthProfile): Promise<void> {
    try {
      const pool = getPool();
      
      const insertProfileQuery = `
        INSERT INTO user_profiles (id, user_id, display_name, timezone, preferred_language, privacy_settings, notification_preferences, onboarding_completed, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `;
      
      await pool.query(insertProfileQuery, [
        crypto.randomUUID(),
        userId,
        profile.name || profile.email.split('@')[0],
        'UTC',
        'en',
        JSON.stringify({}),
        JSON.stringify({}),
        false
      ]);
    } catch (error) {
      logger.error('Create user profile error:', error);
      throw error;
    }
  }
}

/**
 * Authentication service instance providing OAuth handling, JWT token management,
 * user session validation, and database operations for user authentication.
 * 
 * @example
 * ```typescript
 * import { authService } from './services/auth-service';
 * 
 * // Handle OAuth callback
 * const result = await authService.handleOAuthCallback(profile);
 * 
 * // Generate tokens
 * const tokens = await authService.generateTokens(user);
 * 
 * // Validate token
 * const session = await authService.validateToken(payload);
 * ```
 */
export const authService = new AuthService();