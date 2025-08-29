import { Router } from 'express';
import passport from 'passport';
import { authService } from '../services/auth-service';
import { logger } from '../utils/logger';
import { authenticateToken } from '../middleware/auth-middleware';

const router = Router();

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      const authResult = req.user as any;
      
      // Redirect to frontend with tokens
      const redirectUrl = new URL(process.env.FRONTEND_URL + '/auth/callback');
      redirectUrl.searchParams.set('token', authResult.tokens.accessToken);
      redirectUrl.searchParams.set('refresh_token', authResult.tokens.refreshToken);
      redirectUrl.searchParams.set('new_user', authResult.isNewUser.toString());
      
      res.redirect(redirectUrl.toString());
    } catch (error) {
      logger.error('Google callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=authentication_failed`);
    }
  }
);

// Microsoft OAuth routes
router.get('/microsoft', passport.authenticate('microsoft', { scope: ['user.read'] }));

router.get('/microsoft/callback',
  passport.authenticate('microsoft', { session: false }),
  async (req, res) => {
    try {
      const authResult = req.user as any;
      
      const redirectUrl = new URL(process.env.FRONTEND_URL + '/auth/callback');
      redirectUrl.searchParams.set('token', authResult.tokens.accessToken);
      redirectUrl.searchParams.set('refresh_token', authResult.tokens.refreshToken);
      redirectUrl.searchParams.set('new_user', authResult.isNewUser.toString());
      
      res.redirect(redirectUrl.toString());
    } catch (error) {
      logger.error('Microsoft callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=authentication_failed`);
    }
  }
);

// Facebook OAuth routes
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

router.get('/facebook/callback',
  passport.authenticate('facebook', { session: false }),
  async (req, res) => {
    try {
      const authResult = req.user as any;
      
      const redirectUrl = new URL(process.env.FRONTEND_URL + '/auth/callback');
      redirectUrl.searchParams.set('token', authResult.tokens.accessToken);
      redirectUrl.searchParams.set('refresh_token', authResult.tokens.refreshToken);
      redirectUrl.searchParams.set('new_user', authResult.isNewUser.toString());
      
      res.redirect(redirectUrl.toString());
    } catch (error) {
      logger.error('Facebook callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=authentication_failed`);
    }
  }
);

// Apple OAuth routes
router.get('/apple', passport.authenticate('apple', { scope: ['name', 'email'] }));

router.get('/apple/callback',
  passport.authenticate('apple', { session: false }),
  async (req, res) => {
    try {
      const authResult = req.user as any;
      
      const redirectUrl = new URL(process.env.FRONTEND_URL + '/auth/callback');
      redirectUrl.searchParams.set('token', authResult.tokens.accessToken);
      redirectUrl.searchParams.set('refresh_token', authResult.tokens.refreshToken);
      redirectUrl.searchParams.set('new_user', authResult.isNewUser.toString());
      
      res.redirect(redirectUrl.toString());
    } catch (error) {
      logger.error('Apple callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=authentication_failed`);
    }
  }
);

// Token refresh endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const tokens = await authService.refreshToken(refreshToken);
    
    res.json({
      success: true,
      tokens
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({ 
      error: 'Invalid refresh token',
      message: error instanceof Error ? error.message : 'Token refresh failed'
    });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    
    await authService.logout(userId);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Logout failed',
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Get current user endpoint
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const user = await authService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove sensitive information
    const { ...userInfo } = user;
    
    res.json({
      success: true,
      user: userInfo
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({ 
      error: 'Failed to get user information',
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Validate token endpoint
router.post('/validate', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const decoded = await new Promise((resolve, reject) => {
      const jwt = require('jsonwebtoken');
      jwt.verify(token, process.env.JWT_SECRET, (err: any, decoded: any) => {
        if (err) reject(err);
        else resolve(decoded);
      });
    });

    const userSession = await authService.validateToken(decoded as any);
    
    if (!userSession) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({
      success: true,
      valid: true,
      user: userSession
    });
  } catch (error) {
    logger.error('Token validation error:', error);
    res.status(401).json({ 
      error: 'Invalid token',
      valid: false
    });
  }
});

/**
 * Express router containing all authentication-related routes including
 * OAuth callbacks, token refresh, logout, and user validation endpoints.
 * 
 * Routes:
 * - GET /google, /microsoft, /facebook, /apple - OAuth initiation
 * - GET /*/callback - OAuth callback handlers
 * - POST /refresh - Token refresh
 * - POST /logout - User logout
 * - GET /me - Get current user
 * - POST /validate - Token validation
 */
export { router as authRoutes };