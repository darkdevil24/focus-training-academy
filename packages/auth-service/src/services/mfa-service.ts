import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { getPool, getRedis } from '../database/connection';
import { MFASetup, MFAVerification } from '../types/auth';
import { logger } from '../utils/logger';

class MFAService {
  async setupMFA(userId: string): Promise<MFASetup> {
    try {
      const pool = getPool();
      
      // Check if user exists and is admin
      const userQuery = `
        SELECT u.*, array_agg(r.name) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.id = $1
        GROUP BY u.id
      `;
      
      const userResult = await pool.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];
      const roles = user.roles || [];
      
      if (!roles.includes('admin')) {
        throw new Error('MFA is only available for admin users');
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `Focus Academy (${user.email})`,
        issuer: 'Focus Training Academy',
        length: 32
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      // Generate backup codes
      const backupCodes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 8).toUpperCase()
      );

      // Store MFA setup in database (not yet enabled)
      const mfaId = crypto.randomUUID();
      await pool.query(`
        INSERT INTO user_mfa (id, user_id, secret, backup_codes, is_enabled, created_at, updated_at)
        VALUES ($1, $2, $3, $4, false, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          secret = $3,
          backup_codes = $4,
          is_enabled = false,
          updated_at = NOW()
      `, [mfaId, userId, secret.base32, JSON.stringify(backupCodes)]);

      return {
        secret: secret.base32!,
        qrCodeUrl,
        backupCodes
      };
    } catch (error) {
      logger.error('MFA setup error:', error);
      throw error;
    }
  }

  async enableMFA(userId: string, token: string): Promise<boolean> {
    try {
      const pool = getPool();
      
      // Get MFA setup
      const mfaResult = await pool.query(
        'SELECT * FROM user_mfa WHERE user_id = $1',
        [userId]
      );

      if (mfaResult.rows.length === 0) {
        throw new Error('MFA not set up for this user');
      }

      const mfaSetup = mfaResult.rows[0];

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: mfaSetup.secret,
        encoding: 'base32',
        token,
        window: 2 // Allow 2 time steps (60 seconds) of drift
      });

      if (!verified) {
        throw new Error('Invalid MFA token');
      }

      // Enable MFA
      await pool.query(
        'UPDATE user_mfa SET is_enabled = true, updated_at = NOW() WHERE user_id = $1',
        [userId]
      );

      logger.info(`MFA enabled for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('MFA enable error:', error);
      throw error;
    }
  }

  async verifyMFA(userId: string, token: string): Promise<MFAVerification> {
    try {
      const pool = getPool();
      const redis = getRedis();
      
      // Get MFA setup
      const mfaResult = await pool.query(
        'SELECT * FROM user_mfa WHERE user_id = $1 AND is_enabled = true',
        [userId]
      );

      if (mfaResult.rows.length === 0) {
        return { userId, token, isValid: false };
      }

      const mfaSetup = mfaResult.rows[0];

      // Check if it's a backup code
      const backupCodes = JSON.parse(mfaSetup.backup_codes || '[]');
      if (backupCodes.includes(token.toUpperCase())) {
        // Remove used backup code
        const updatedCodes = backupCodes.filter((code: string) => code !== token.toUpperCase());
        await pool.query(
          'UPDATE user_mfa SET backup_codes = $1, updated_at = NOW() WHERE user_id = $2',
          [JSON.stringify(updatedCodes), userId]
        );

        logger.info(`Backup code used for user ${userId}`);
        return { userId, token, isValid: true };
      }

      // Check for replay attacks (token reuse)
      const tokenKey = `mfa_token:${userId}:${token}`;
      const tokenUsed = await redis.get(tokenKey);
      
      if (tokenUsed) {
        logger.warn(`MFA token replay attempt for user ${userId}`);
        return { userId, token, isValid: false };
      }

      // Verify TOTP token
      const verified = speakeasy.totp.verify({
        secret: mfaSetup.secret,
        encoding: 'base32',
        token,
        window: 2
      });

      if (verified) {
        // Mark token as used (prevent replay)
        await redis.setex(tokenKey, 90, 'used'); // 90 seconds (3 time windows)
        
        logger.info(`MFA verification successful for user ${userId}`);
      }

      return { userId, token, isValid: verified };
    } catch (error) {
      logger.error('MFA verification error:', error);
      return { userId, token, isValid: false };
    }
  }

  async disableMFA(userId: string, token: string): Promise<boolean> {
    try {
      // Verify current MFA token before disabling
      const verification = await this.verifyMFA(userId, token);
      
      if (!verification.isValid) {
        throw new Error('Invalid MFA token');
      }

      const pool = getPool();
      await pool.query(
        'UPDATE user_mfa SET is_enabled = false, updated_at = NOW() WHERE user_id = $1',
        [userId]
      );

      logger.info(`MFA disabled for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('MFA disable error:', error);
      throw error;
    }
  }

  async getMFAStatus(userId: string): Promise<{ enabled: boolean; backupCodesRemaining: number }> {
    try {
      const pool = getPool();
      
      const mfaResult = await pool.query(
        'SELECT is_enabled, backup_codes FROM user_mfa WHERE user_id = $1',
        [userId]
      );

      if (mfaResult.rows.length === 0) {
        return { enabled: false, backupCodesRemaining: 0 };
      }

      const mfaSetup = mfaResult.rows[0];
      const backupCodes = JSON.parse(mfaSetup.backup_codes || '[]');

      return {
        enabled: mfaSetup.is_enabled,
        backupCodesRemaining: backupCodes.length
      };
    } catch (error) {
      logger.error('Get MFA status error:', error);
      return { enabled: false, backupCodesRemaining: 0 };
    }
  }

  async regenerateBackupCodes(userId: string, token: string): Promise<string[]> {
    try {
      // Verify current MFA token
      const verification = await this.verifyMFA(userId, token);
      
      if (!verification.isValid) {
        throw new Error('Invalid MFA token');
      }

      // Generate new backup codes
      const backupCodes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 8).toUpperCase()
      );

      const pool = getPool();
      await pool.query(
        'UPDATE user_mfa SET backup_codes = $1, updated_at = NOW() WHERE user_id = $2',
        [JSON.stringify(backupCodes), userId]
      );

      logger.info(`Backup codes regenerated for user ${userId}`);
      return backupCodes;
    } catch (error) {
      logger.error('Regenerate backup codes error:', error);
      throw error;
    }
  }
}

/**
 * Multi-Factor Authentication service instance providing TOTP setup, verification,
 * backup code management, and MFA status operations for admin users.
 * 
 * @example
 * ```typescript
 * import { mfaService } from './services/mfa-service';
 * 
 * // Setup MFA for admin user
 * const setup = await mfaService.setupMFA(userId);
 * 
 * // Verify MFA token
 * const verification = await mfaService.verifyMFA(userId, token);
 * 
 * // Get MFA status
 * const status = await mfaService.getMFAStatus(userId);
 * ```
 */
export const mfaService = new MFAService();