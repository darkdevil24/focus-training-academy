import { Router } from 'express';
import { mfaService } from '../services/mfa-service';
import { authenticateToken, requireRole } from '../middleware/auth-middleware';
import { logger } from '../utils/logger';

const router = Router();

// All MFA routes require authentication
router.use(authenticateToken);

// Setup MFA (admin only)
router.post('/setup', requireRole(['admin']), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    
    const mfaSetup = await mfaService.setupMFA(userId);
    
    res.json({
      success: true,
      setup: {
        qrCodeUrl: mfaSetup.qrCodeUrl,
        backupCodes: mfaSetup.backupCodes,
        instructions: 'Scan the QR code with your authenticator app, then verify with a token to enable MFA'
      }
    });
  } catch (error) {
    logger.error('MFA setup error:', error);
    res.status(400).json({ 
      error: 'MFA setup failed',
      message: error instanceof Error ? error.message : 'Setup failed'
    });
  }
});

// Enable MFA (admin only)
router.post('/enable', requireRole(['admin']), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'MFA token is required' });
    }

    const enabled = await mfaService.enableMFA(userId, token);
    
    if (enabled) {
      res.json({
        success: true,
        message: 'MFA enabled successfully'
      });
    } else {
      res.status(400).json({ error: 'Failed to enable MFA' });
    }
  } catch (error) {
    logger.error('MFA enable error:', error);
    res.status(400).json({ 
      error: 'Failed to enable MFA',
      message: error instanceof Error ? error.message : 'Enable failed'
    });
  }
});

// Verify MFA token
router.post('/verify', async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'MFA token is required' });
    }

    const verification = await mfaService.verifyMFA(userId, token);
    
    res.json({
      success: true,
      valid: verification.isValid,
      message: verification.isValid ? 'Token verified' : 'Invalid token'
    });
  } catch (error) {
    logger.error('MFA verification error:', error);
    res.status(500).json({ 
      error: 'MFA verification failed',
      message: error instanceof Error ? error.message : 'Verification failed'
    });
  }
});

// Disable MFA (admin only)
router.post('/disable', requireRole(['admin']), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'MFA token is required to disable MFA' });
    }

    const disabled = await mfaService.disableMFA(userId, token);
    
    if (disabled) {
      res.json({
        success: true,
        message: 'MFA disabled successfully'
      });
    } else {
      res.status(400).json({ error: 'Failed to disable MFA' });
    }
  } catch (error) {
    logger.error('MFA disable error:', error);
    res.status(400).json({ 
      error: 'Failed to disable MFA',
      message: error instanceof Error ? error.message : 'Disable failed'
    });
  }
});

// Get MFA status
router.get('/status', async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    
    const status = await mfaService.getMFAStatus(userId);
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    logger.error('Get MFA status error:', error);
    res.status(500).json({ 
      error: 'Failed to get MFA status',
      message: error instanceof Error ? error.message : 'Status check failed'
    });
  }
});

// Regenerate backup codes (admin only)
router.post('/backup-codes/regenerate', requireRole(['admin']), async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'MFA token is required' });
    }

    const backupCodes = await mfaService.regenerateBackupCodes(userId, token);
    
    res.json({
      success: true,
      backupCodes,
      message: 'New backup codes generated. Store them securely.'
    });
  } catch (error) {
    logger.error('Regenerate backup codes error:', error);
    res.status(400).json({ 
      error: 'Failed to regenerate backup codes',
      message: error instanceof Error ? error.message : 'Regeneration failed'
    });
  }
});

export { router as mfaRoutes };