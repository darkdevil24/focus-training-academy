import { logger } from './logger';

interface RequiredEnvVars {
  [key: string]: string | undefined;
}

interface OptionalEnvVars {
  [key: string]: string | undefined;
}

export function validateEnvironment(): void {
  const required: RequiredEnvVars = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    BASE_URL: process.env.BASE_URL,
    FRONTEND_URL: process.env.FRONTEND_URL,
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    JWT_SECRET: process.env.JWT_SECRET,
  };

  const optional: OptionalEnvVars = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID,
    MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET,
    FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
    FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,
    APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID,
    APPLE_TEAM_ID: process.env.APPLE_TEAM_ID,
    APPLE_KEY_ID: process.env.APPLE_KEY_ID,
    APPLE_PRIVATE_KEY: process.env.APPLE_PRIVATE_KEY,
  };

  // Check required variables
  const missingRequired = Object.entries(required)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingRequired.length > 0) {
    logger.error('Missing required environment variables:', missingRequired);
    throw new Error(`Missing required environment variables: ${missingRequired.join(', ')}`);
  }

  // Validate JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logger.warn('JWT_SECRET is too short. Use at least 32 characters for security.');
  }

  // Check OAuth providers
  const oauthProviders = [];
  
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    oauthProviders.push('Google');
  }
  
  if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    oauthProviders.push('Microsoft');
  }
  
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    oauthProviders.push('Facebook');
  }
  
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && 
      process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
    oauthProviders.push('Apple');
  }

  if (oauthProviders.length === 0) {
    logger.warn('⚠️  No OAuth providers configured. Users will not be able to authenticate.');
    logger.warn('   Configure at least one OAuth provider in your .env file.');
    logger.warn('   See docs/google-oauth-complete-setup.md for setup instructions.');
  } else {
    logger.info(`✅ OAuth providers configured: ${oauthProviders.join(', ')}`);
  }

  // Validate HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.BASE_URL?.startsWith('https://')) {
      throw new Error('BASE_URL must use HTTPS in production');
    }
    
    if (!process.env.FRONTEND_URL?.startsWith('https://')) {
      throw new Error('FRONTEND_URL must use HTTPS in production');
    }
  }

  // Validate development HTTPS for OAuth
  if (process.env.NODE_ENV === 'development' && oauthProviders.length > 0) {
    if (!process.env.BASE_URL?.startsWith('https://')) {
      logger.warn('⚠️  OAuth providers require HTTPS. Set BASE_URL to https://localhost:3001');
      logger.warn('   Run: node scripts/setup-https.js to set up local HTTPS certificates');
    }
  }

  logger.info('✅ Environment validation completed successfully');
}