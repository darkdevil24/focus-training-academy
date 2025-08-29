import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { OAuthProfile, OAuthProvider } from '../types/auth';
import { authService } from '../services/auth-service';
import { logger } from '../utils/logger';

/**
 * Configures Passport.js strategies for OAuth authentication including
 * Google, Facebook, Microsoft, Apple, and JWT token validation.
 * 
 * Sets up serialization/deserialization for session management and
 * configures OAuth callback handling for all supported providers.
 * 
 * @example
 * ```typescript
 * import { configurePassport } from './config/passport';
 * 
 * // Configure all OAuth strategies
 * configurePassport();
 * ```
 */
export function configurePassport(): void {
  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BASE_URL}/auth/google/callback`,
      scope: ['profile', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const oauthProfile: OAuthProfile = {
          id: profile.id,
          email: profile.emails?.[0]?.value || '',
          name: profile.displayName,
          picture: profile.photos?.[0]?.value,
          provider: 'google'
        };
        
        const result = await authService.handleOAuthCallback(oauthProfile);
        return done(null, result);
      } catch (error) {
        logger.error('Google OAuth error:', error);
        return done(error, null);
      }
    }));
  }

  // Facebook OAuth Strategy
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: `${process.env.BASE_URL}/auth/facebook/callback`,
      profileFields: ['id', 'emails', 'name', 'picture']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const oauthProfile: OAuthProfile = {
          id: profile.id,
          email: profile.emails?.[0]?.value || '',
          name: profile.displayName,
          picture: profile.photos?.[0]?.value,
          provider: 'facebook'
        };
        
        const result = await authService.handleOAuthCallback(oauthProfile);
        return done(null, result);
      } catch (error) {
        logger.error('Facebook OAuth error:', error);
        return done(error, null);
      }
    }));
  }

  // Microsoft OAuth Strategy (using passport-microsoft)
  if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    const MicrosoftStrategy = require('passport-microsoft').Strategy;
    
    passport.use(new MicrosoftStrategy({
      clientID: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      callbackURL: `${process.env.BASE_URL}/auth/microsoft/callback`,
      scope: ['user.read']
    }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        const oauthProfile: OAuthProfile = {
          id: profile.id,
          email: profile.emails?.[0]?.value || profile.mail || profile.userPrincipalName,
          name: profile.displayName,
          picture: profile.photos?.[0]?.value,
          provider: 'microsoft'
        };
        
        const result = await authService.handleOAuthCallback(oauthProfile);
        return done(null, result);
      } catch (error) {
        logger.error('Microsoft OAuth error:', error);
        return done(error, null);
      }
    }));
  }

  // Apple OAuth Strategy (using passport-apple)
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
    const AppleStrategy = require('passport-apple').Strategy;
    
    passport.use(new AppleStrategy({
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      privateKey: process.env.APPLE_PRIVATE_KEY,
      callbackURL: `${process.env.BASE_URL}/auth/apple/callback`,
      scope: ['name', 'email']
    }, async (accessToken: string, refreshToken: string, idToken: any, profile: any, done: any) => {
      try {
        const oauthProfile: OAuthProfile = {
          id: profile.id,
          email: profile.email,
          name: profile.name ? `${profile.name.firstName} ${profile.name.lastName}` : undefined,
          provider: 'apple'
        };
        
        const result = await authService.handleOAuthCallback(oauthProfile);
        return done(null, result);
      } catch (error) {
        logger.error('Apple OAuth error:', error);
        return done(error, null);
      }
    }));
  }

  // JWT Strategy for token validation
  passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    algorithms: ['HS256']
  }, async (payload, done) => {
    try {
      const user = await authService.validateToken(payload);
      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    } catch (error) {
      logger.error('JWT validation error:', error);
      return done(error, false);
    }
  }));

  // Serialize/deserialize user for session management
  passport.serializeUser((user: any, done) => {
    done(null, user.user?.id || user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await authService.getUserById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
}