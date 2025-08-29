import request from 'supertest';
import { app } from '../index';
import { getPool } from '../database/connection';
import { authService } from '../services/auth-service';
import { mfaService } from '../services/mfa-service';
import speakeasy from 'speakeasy';

describe('MFA Integration Tests', () => {
  let pool: any;
  let adminUser: any;
  let adminToken: string;
  let regularUser: any;
  let regularToken: string;

  beforeAll(async () => {
    // Wait for database connection
    await new Promise(resolve => setTimeout(resolve, 1000));
    pool = getPool();

    // Create admin user
    const adminProfile = {
      id: 'admin123',
      email: 'admin@example.com',
      name: 'Admin User',
      provider: 'google' as const
    };

    const adminResult = await authService.handleOAuthCallback(adminProfile);
    adminUser = adminResult.user;
    adminToken = adminResult.tokens.accessToken;

    // Assign admin role
    const adminRoleResult = await pool.query('SELECT id FROM roles WHERE name = $1', ['admin']);
    if (adminRoleResult.rows.length > 0) {
      await pool.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [adminUser.id, adminRoleResult.rows[0].id]
      );
    }

    // Create regular user
    const userProfile = {
      id: 'user123',
      email: 'user@example.com',
      name: 'Regular User',
      provider: 'google' as const
    };

    const userResult = await authService.handleOAuthCallback(userProfile);
    regularUser = userResult.user;
    regularToken = userResult.tokens.accessToken;

    // Assign user role
    const userRoleResult = await pool.query('SELECT id FROM roles WHERE name = $1', ['user']);
    if (userRoleResult.rows.length > 0) {
      await pool.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [regularUser.id, userRoleResult.rows[0].id]
      );
    }
  });

  beforeEach(async () => {
    // Clean up MFA data
    await pool.query('DELETE FROM user_mfa WHERE user_id IN ($1, $2)', [adminUser.id, regularUser.id]);
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM user_roles WHERE user_id IN ($1, $2)', [adminUser.id, regularUser.id]);
    await pool.query('DELETE FROM user_mfa WHERE user_id IN ($1, $2)', [adminUser.id, regularUser.id]);
    await pool.query('DELETE FROM user_profiles WHERE user_id IN ($1, $2)', [adminUser.id, regularUser.id]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [adminUser.id, regularUser.id]);
    await pool.end();
  });

  describe('MFA Setup', () => {
    test('admin should be able to setup MFA', async () => {
      const response = await request(app)
        .post('/mfa/setup')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.setup.qrCodeUrl).toBeDefined();
      expect(response.body.setup.backupCodes).toHaveLength(10);
      expect(response.body.setup.instructions).toBeDefined();
    });

    test('regular user should not be able to setup MFA', async () => {
      const response = await request(app)
        .post('/mfa/setup')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });

    test('unauthenticated user should not be able to setup MFA', async () => {
      await request(app)
        .post('/mfa/setup')
        .expect(401);
    });
  });

  describe('MFA Enable/Disable', () => {
    let mfaSecret: string;

    beforeEach(async () => {
      const setup = await mfaService.setupMFA(adminUser.id);
      mfaSecret = setup.secret;
    });

    test('admin should be able to enable MFA with valid token', async () => {
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      const response = await request(app)
        .post('/mfa/enable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ token })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('MFA enabled successfully');
    });

    test('admin should not be able to enable MFA with invalid token', async () => {
      const response = await request(app)
        .post('/mfa/enable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ token: '000000' })
        .expect(400);

      expect(response.body.error).toBe('Failed to enable MFA');
    });

    test('admin should be able to disable MFA with valid token', async () => {
      // First enable MFA
      const enableToken = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      await mfaService.enableMFA(adminUser.id, enableToken);

      // Wait a moment to get a different token
      await new Promise(resolve => setTimeout(resolve, 1000));

      const disableToken = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      const response = await request(app)
        .post('/mfa/disable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ token: disableToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('MFA disabled successfully');
    });
  });

  describe('MFA Verification', () => {
    let mfaSecret: string;

    beforeEach(async () => {
      const setup = await mfaService.setupMFA(adminUser.id);
      mfaSecret = setup.secret;

      const enableToken = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      await mfaService.enableMFA(adminUser.id, enableToken);
    });

    test('should verify valid TOTP token', async () => {
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      const response = await request(app)
        .post('/mfa/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ token })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.valid).toBe(true);
    });

    test('should reject invalid TOTP token', async () => {
      const response = await request(app)
        .post('/mfa/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ token: '000000' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.valid).toBe(false);
    });

    test('should verify backup code', async () => {
      const setup = await mfaService.setupMFA(adminUser.id);
      const backupCode = setup.backupCodes[0];

      // Enable MFA first
      const enableToken = speakeasy.totp({
        secret: setup.secret,
        encoding: 'base32'
      });
      await mfaService.enableMFA(adminUser.id, enableToken);

      const response = await request(app)
        .post('/mfa/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ token: backupCode })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.valid).toBe(true);
    });

    test('should prevent token replay attacks', async () => {
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      // First verification should succeed
      const firstResponse = await request(app)
        .post('/mfa/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ token })
        .expect(200);

      expect(firstResponse.body.valid).toBe(true);

      // Second verification with same token should fail
      const secondResponse = await request(app)
        .post('/mfa/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ token })
        .expect(200);

      expect(secondResponse.body.valid).toBe(false);
    });
  });

  describe('MFA Status', () => {
    test('should return MFA status for user without MFA', async () => {
      const response = await request(app)
        .get('/mfa/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status.enabled).toBe(false);
      expect(response.body.status.backupCodesRemaining).toBe(0);
    });

    test('should return MFA status for user with MFA enabled', async () => {
      const setup = await mfaService.setupMFA(adminUser.id);
      const token = speakeasy.totp({
        secret: setup.secret,
        encoding: 'base32'
      });

      await mfaService.enableMFA(adminUser.id, token);

      const response = await request(app)
        .get('/mfa/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status.enabled).toBe(true);
      expect(response.body.status.backupCodesRemaining).toBe(10);
    });
  });

  describe('Backup Codes', () => {
    let mfaSecret: string;

    beforeEach(async () => {
      const setup = await mfaService.setupMFA(adminUser.id);
      mfaSecret = setup.secret;

      const enableToken = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      await mfaService.enableMFA(adminUser.id, enableToken);
    });

    test('admin should be able to regenerate backup codes', async () => {
      const token = speakeasy.totp({
        secret: mfaSecret,
        encoding: 'base32'
      });

      const response = await request(app)
        .post('/mfa/backup-codes/regenerate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ token })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.backupCodes).toHaveLength(10);
      expect(response.body.message).toContain('Store them securely');
    });

    test('should not regenerate backup codes with invalid token', async () => {
      const response = await request(app)
        .post('/mfa/backup-codes/regenerate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ token: '000000' })
        .expect(400);

      expect(response.body.error).toBe('Failed to regenerate backup codes');
    });

    test('regular user should not be able to regenerate backup codes', async () => {
      const response = await request(app)
        .post('/mfa/backup-codes/regenerate')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ token: '123456' })
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });
  });

  describe('Role-Based Access Control', () => {
    test('should enforce admin role for MFA setup', async () => {
      await request(app)
        .post('/mfa/setup')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(403);
    });

    test('should enforce admin role for MFA enable', async () => {
      await request(app)
        .post('/mfa/enable')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ token: '123456' })
        .expect(403);
    });

    test('should enforce admin role for MFA disable', async () => {
      await request(app)
        .post('/mfa/disable')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ token: '123456' })
        .expect(403);
    });

    test('should allow any authenticated user to verify MFA', async () => {
      // This should not return 403, but may return 400 or 500 due to no MFA setup
      const response = await request(app)
        .post('/mfa/verify')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ token: '123456' });

      expect(response.status).not.toBe(403);
    });

    test('should allow any authenticated user to check MFA status', async () => {
      await request(app)
        .get('/mfa/status')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect(200);
    });
  });
});