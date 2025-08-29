# OAuth Provider Setup Guide

This guide walks you through setting up OAuth applications with each provider for the Focus Training Academy authentication system.

## Prerequisites

- HTTPS development environment (required for OAuth)
- Domain or localhost with SSL certificate
- Access to each OAuth provider's developer console

## 🔧 Development Setup (Quick Start)

For **development and testing**, you can use these test credentials:

### 1. Copy Environment File
```bash
cp packages/auth-service/.env.example packages/auth-service/.env
```

### 2. Generate JWT Secret
```bash
# Generate a secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Update .env with Development Values
```env
# Use the generated JWT secret
JWT_SECRET=your-generated-secret-here

# For development, you can start with Google OAuth only
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 🌐 Production OAuth Setup

### Google OAuth Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Create a new project or select existing one

2. **Enable Google+ API**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Name: "Focus Training Academy"

4. **Configure Redirect URIs**
   ```
   Development: https://localhost:3001/auth/google/callback
   Production: https://yourdomain.com/auth/google/callback
   ```

5. **Add to .env**
   ```env
   GOOGLE_CLIENT_ID=your-actual-client-id
   GOOGLE_CLIENT_SECRET=your-actual-client-secret
   ```

### Microsoft OAuth Setup

1. **Go to Azure Portal**
   - Visit: https://portal.azure.com/
   - Navigate to "Azure Active Directory" > "App registrations"

2. **Register New Application**
   - Click "New registration"
   - Name: "Focus Training Academy"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"

3. **Configure Redirect URI**
   - Platform: "Web"
   - Redirect URI: `https://localhost:3001/auth/microsoft/callback`

4. **Generate Client Secret**
   - Go to "Certificates & secrets"
   - Click "New client secret"
   - Copy the secret value immediately

5. **Add to .env**
   ```env
   MICROSOFT_CLIENT_ID=your-application-id
   MICROSOFT_CLIENT_SECRET=your-client-secret
   ```

### Facebook OAuth Setup

1. **Go to Facebook Developers**
   - Visit: https://developers.facebook.com/
   - Create a new app or use existing

2. **Add Facebook Login Product**
   - In your app dashboard, click "Add Product"
   - Select "Facebook Login" > "Set Up"

3. **Configure OAuth Settings**
   - Go to Facebook Login > Settings
   - Valid OAuth Redirect URIs:
     ```
     https://localhost:3001/auth/facebook/callback
     https://yourdomain.com/auth/facebook/callback
     ```

4. **Get App Credentials**
   - Go to Settings > Basic
   - Copy App ID and App Secret

5. **Add to .env**
   ```env
   FACEBOOK_APP_ID=your-app-id
   FACEBOOK_APP_SECRET=your-app-secret
   ```

### Apple OAuth Setup

1. **Go to Apple Developer**
   - Visit: https://developer.apple.com/
   - Sign in with your Apple Developer account

2. **Create App ID**
   - Go to "Certificates, Identifiers & Profiles"
   - Create new App ID with "Sign In with Apple" capability

3. **Create Service ID**
   - Create new Services ID
   - Configure "Sign In with Apple"
   - Add domain and redirect URL:
     ```
     Domain: localhost (for dev) or yourdomain.com
     Redirect URL: https://localhost:3001/auth/apple/callback
     ```

4. **Generate Private Key**
   - Create new Key with "Sign In with Apple" capability
   - Download the .p8 file
   - Note the Key ID

5. **Add to .env**
   ```env
   APPLE_CLIENT_ID=your-service-id
   APPLE_TEAM_ID=your-team-id
   APPLE_KEY_ID=your-key-id
   APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key content\n-----END PRIVATE KEY-----"
   ```

## 🔒 Security Considerations

### Development
- Use HTTPS even in development (mkcert recommended)
- Never commit real credentials to version control
- Use different OAuth apps for dev/staging/production

### Production
- Rotate secrets regularly
- Use environment-specific OAuth applications
- Enable additional security features (2FA, IP restrictions)
- Monitor OAuth usage and failed attempts

## 🧪 Testing OAuth Integration

### 1. Start the Auth Service
```bash
cd packages/auth-service
npm run dev
```

### 2. Test OAuth Endpoints
```bash
# Test Google OAuth (opens browser)
curl -I https://localhost:3001/auth/google

# Test Microsoft OAuth
curl -I https://localhost:3001/auth/microsoft

# Test Facebook OAuth
curl -I https://localhost:3001/auth/facebook

# Test Apple OAuth
curl -I https://localhost:3001/auth/apple
```

### 3. Verify Callback Handling
- Complete OAuth flow in browser
- Check that user is created in database
- Verify JWT tokens are generated
- Test token refresh functionality

## 🚨 Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" Error**
   - Ensure redirect URI in OAuth app matches exactly
   - Check HTTPS vs HTTP
   - Verify port numbers

2. **"invalid_client" Error**
   - Check client ID and secret are correct
   - Ensure OAuth app is enabled/published

3. **HTTPS Required Error**
   - OAuth providers require HTTPS in production
   - Use mkcert for local HTTPS development

4. **CORS Issues**
   - Ensure FRONTEND_URL is correctly configured
   - Check CORS settings in auth service

### Debug Mode
Enable debug logging:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

## 📋 Checklist

Before going to production:

- [ ] All OAuth applications created and configured
- [ ] Redirect URIs updated for production domain
- [ ] Environment variables set in production
- [ ] HTTPS certificates configured
- [ ] Database migrations run
- [ ] Redis instance configured
- [ ] Health checks passing
- [ ] OAuth flows tested end-to-end

## 🔄 OAuth Flow Testing

Use the included integration tests:
```bash
cd packages/auth-service
npm run test:integration
```

Or test manually by visiting:
- https://localhost:3001/auth/google
- https://localhost:3001/auth/microsoft
- https://localhost:3001/auth/facebook
- https://localhost:3001/auth/apple

Each should redirect to the respective OAuth provider and back to your application.