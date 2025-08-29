#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔐 Focus Training Academy - OAuth Development Setup\n');

// Generate secure JWT secret
const jwtSecret = crypto.randomBytes(64).toString('hex');

// Create development .env file
const envPath = path.join(__dirname, '../packages/auth-service/.env');
const envExamplePath = path.join(__dirname, '../packages/auth-service/.env.example');

if (fs.existsSync(envPath)) {
  console.log('⚠️  .env file already exists. Backing up to .env.backup');
  fs.copyFileSync(envPath, envPath + '.backup');
}

// Read example file
let envContent = fs.readFileSync(envExamplePath, 'utf8');

// Replace placeholders with development values
envContent = envContent
  .replace('your-super-secret-jwt-key-change-in-production', jwtSecret)
  .replace('your-google-client-id', 'REPLACE_WITH_GOOGLE_CLIENT_ID')
  .replace('your-google-client-secret', 'REPLACE_WITH_GOOGLE_CLIENT_SECRET')
  .replace('your-microsoft-client-id', 'REPLACE_WITH_MICROSOFT_CLIENT_ID')
  .replace('your-microsoft-client-secret', 'REPLACE_WITH_MICROSOFT_CLIENT_SECRET')
  .replace('your-facebook-app-id', 'REPLACE_WITH_FACEBOOK_APP_ID')
  .replace('your-facebook-app-secret', 'REPLACE_WITH_FACEBOOK_APP_SECRET')
  .replace('your-apple-client-id', 'REPLACE_WITH_APPLE_CLIENT_ID')
  .replace('your-apple-team-id', 'REPLACE_WITH_APPLE_TEAM_ID')
  .replace('your-apple-key-id', 'REPLACE_WITH_APPLE_KEY_ID')
  .replace('your-apple-private-key', 'REPLACE_WITH_APPLE_PRIVATE_KEY');

// Write development .env file
fs.writeFileSync(envPath, envContent);

console.log('✅ Created packages/auth-service/.env with secure JWT secret');
console.log('🔑 Generated JWT Secret:', jwtSecret.substring(0, 20) + '...');

console.log('\n📋 Next Steps:');
console.log('1. Set up OAuth applications with providers (see docs/oauth-setup-guide.md)');
console.log('2. Replace OAuth placeholders in packages/auth-service/.env');
console.log('3. Start PostgreSQL and Redis services');
console.log('4. Run database migrations: npm run migrate');
console.log('5. Start auth service: cd packages/auth-service && npm run dev');

console.log('\n🚀 Quick Start (Google OAuth only):');
console.log('1. Go to https://console.cloud.google.com/');
console.log('2. Create OAuth 2.0 credentials');
console.log('3. Add redirect URI: https://localhost:3001/auth/google/callback');
console.log('4. Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
console.log('5. Test: https://localhost:3001/auth/google');

console.log('\n📖 Full setup guide: docs/oauth-setup-guide.md');