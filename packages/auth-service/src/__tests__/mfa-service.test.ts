import { mfaService } from '../services/mfa-service';
import { getPool, getRedis } from '../database/connection';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// Mock dependencies
jest.mock('../database/connection');
jest.mock('speakeasy');
jest.mock('qrcode');

const mockPool = {
  query: jest.fn(),
};

const mockRedis = {
  get: jest.fn(),
  setex: jest.fn(),
};

(getPool as jest.Mock).mockReturnValue(mockPool);
(getRedis as jest.Mock).mockReturnValue(mockRedis);

describe('MFAService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setupMFA', () => {
    test('should setup MFA for admin user', async () => {
      const mockUser = {
        id: 'admin123',
        email: 'admin@example.com',
        roles: ['admin']
      };

      const mockSecret = {
        base32: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/Focus%20Academy%20(admin@example.com)?secret=JBSWY3DPEHPK3PXP&issuer=Focus%20Training%20Academy'
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // Get user with roles
        .mockResolvedValueOnce({ rows: [] }); // Insert MFA setup

      (speakeasy.generateSecret as jest.Mock).mockReturnValue(mockSecret);
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,mock-qr-code');

      const setup = await mfaService.setupMFA('admin123');

      expect(setup.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(setup.qrCodeUrl).toBe('data:image/png;base64,mock-qr-code');
      expect(setup.backupCodes).toHaveLength(10);
    });

    test('should reject MFA setup for non-admin user', async () => {
      const mockUser = {
        id: 'user123',
        email: 'user@example.com',
        roles: ['user']
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

      await expect(mfaService.setupMFA('user123')).rejects.toThrow('MFA is only available for admin users');
    });

    test('should reject MFA setup for non-existent user', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(mfaService.setupMFA('nonexistent')).rejects.toThrow('User not found');
    });
  });

  describe('enableMFA', () => {
    test('should enable MFA with valid token', async () => {
      const mockMFASetup = {
        id: 'mfa123',
        user_id: 'admin123',
        secret: 'JBSWY3DPEHPK3PXP',
        is_enabled: false
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockMFASetup] }) // Get MFA setup
        .mockResolvedValueOnce({ rows: [] }); // Enable MFA

      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      const result = await mfaService.enableMFA('admin123', '123456');

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE user_mfa SET is_enabled = true, updated_at = NOW() WHERE user_id = $1',
        ['admin123']
      );
    });

    test('should reject invalid token', async () => {
      const mockMFASetup = {
        id: 'mfa123',
        user_id: 'admin123',
        secret: 'JBSWY3DPEHPK3PXP',
        is_enabled: false
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockMFASetup] });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(mfaService.enableMFA('admin123', '000000')).rejects.toThrow('Invalid MFA token');
    });

    test('should reject if MFA not set up', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(mfaService.enableMFA('admin123', '123456')).rejects.toThrow('MFA not set up for this user');
    });
  });

  describe('verifyMFA', () => {
    test('should verify valid TOTP token', async () => {
      const mockMFASetup = {
        id: 'mfa123',
        user_id: 'admin123',
        secret: 'JBSWY3DPEHPK3PXP',
        backup_codes: '["CODE1", "CODE2"]',
        is_enabled: true
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockMFASetup] });
      mockRedis.get.mockResolvedValue(null); // Token not used before
      mockRedis.setex.mockResolvedValue('OK');
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      const result = await mfaService.verifyMFA('admin123', '123456');

      expect(result.isValid).toBe(true);
      expect(result.userId).toBe('admin123');
      expect(mockRedis.setex).toHaveBeenCalledWith('mfa_token:admin123:123456', 90, 'used');
    });

    test('should verify backup code', async () => {
      const mockMFASetup = {
        id: 'mfa123',
        user_id: 'admin123',
        secret: 'JBSWY3DPEHPK3PXP',
        backup_codes: '["CODE1", "CODE2"]',
        is_enabled: true
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockMFASetup] }) // Get MFA setup
        .mockResolvedValueOnce({ rows: [] }); // Update backup codes

      const result = await mfaService.verifyMFA('admin123', 'CODE1');

      expect(result.isValid).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE user_mfa SET backup_codes = $1, updated_at = NOW() WHERE user_id = $2',
        ['["CODE2"]', 'admin123']
      );
    });

    test('should reject token replay attack', async () => {
      const mockMFASetup = {
        id: 'mfa123',
        user_id: 'admin123',
        secret: 'JBSWY3DPEHPK3PXP',
        backup_codes: '[]',
        is_enabled: true
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockMFASetup] });
      mockRedis.get.mockResolvedValue('used'); // Token already used

      const result = await mfaService.verifyMFA('admin123', '123456');

      expect(result.isValid).toBe(false);
    });

    test('should return false for user without MFA', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await mfaService.verifyMFA('user123', '123456');

      expect(result.isValid).toBe(false);
    });

    test('should reject invalid TOTP token', async () => {
      const mockMFASetup = {
        id: 'mfa123',
        user_id: 'admin123',
        secret: 'JBSWY3DPEHPK3PXP',
        backup_codes: '[]',
        is_enabled: true
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockMFASetup] });
      mockRedis.get.mockResolvedValue(null);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      const result = await mfaService.verifyMFA('admin123', '000000');

      expect(result.isValid).toBe(false);
    });
  });

  describe('disableMFA', () => {
    test('should disable MFA with valid token', async () => {
      // Mock successful verification
      jest.spyOn(mfaService, 'verifyMFA').mockResolvedValue({
        userId: 'admin123',
        token: '123456',
        isValid: true
      });

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await mfaService.disableMFA('admin123', '123456');

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE user_mfa SET is_enabled = false, updated_at = NOW() WHERE user_id = $1',
        ['admin123']
      );
    });

    test('should reject invalid token', async () => {
      jest.spyOn(mfaService, 'verifyMFA').mockResolvedValue({
        userId: 'admin123',
        token: '000000',
        isValid: false
      });

      await expect(mfaService.disableMFA('admin123', '000000')).rejects.toThrow('Invalid MFA token');
    });
  });

  describe('getMFAStatus', () => {
    test('should return status for user with MFA enabled', async () => {
      const mockMFASetup = {
        is_enabled: true,
        backup_codes: '["CODE1", "CODE2", "CODE3"]'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockMFASetup] });

      const status = await mfaService.getMFAStatus('admin123');

      expect(status.enabled).toBe(true);
      expect(status.backupCodesRemaining).toBe(3);
    });

    test('should return status for user without MFA', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const status = await mfaService.getMFAStatus('user123');

      expect(status.enabled).toBe(false);
      expect(status.backupCodesRemaining).toBe(0);
    });
  });

  describe('regenerateBackupCodes', () => {
    test('should regenerate backup codes with valid token', async () => {
      jest.spyOn(mfaService, 'verifyMFA').mockResolvedValue({
        userId: 'admin123',
        token: '123456',
        isValid: true
      });

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const backupCodes = await mfaService.regenerateBackupCodes('admin123', '123456');

      expect(backupCodes).toHaveLength(10);
      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE user_mfa SET backup_codes = $1, updated_at = NOW() WHERE user_id = $2',
        [JSON.stringify(backupCodes), 'admin123']
      );
    });

    test('should reject invalid token', async () => {
      jest.spyOn(mfaService, 'verifyMFA').mockResolvedValue({
        userId: 'admin123',
        token: '000000',
        isValid: false
      });

      await expect(mfaService.regenerateBackupCodes('admin123', '000000')).rejects.toThrow('Invalid MFA token');
    });
  });
});