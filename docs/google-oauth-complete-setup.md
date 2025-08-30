# Google OAuth Complete Setup Guide

## 🔍 Research Summary: Required Google APIs

Based on our OAuth implementation, here are the **exact APIs and services** you need to enable:

### ✅ Required Google APIs:
1. **Google+ API** (Legacy - for profile access)
2. **People API** (Modern replacement for Google+ API)
3. **OAuth 2.0 API** (Automatically enabled with credentials)

### ⚠️ Important Notes:
- **Google+ API is deprecated** but still works for basic profile access
- **People API** is the modern replacement and recommended approach
- Our implementation uses **passport-google-oauth20** which works with both

## 📋 Step-by-Step Setup Process

### Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create New Project**
   - Click "Select a project" dropdown
   - Click "New Project"
   - Project name: `Focus Training Academy`
   - Organization: (leave default or select your org)
   - Click "Create"

### Step 2: Enable Required APIs

1. **Navigate to APIs & Services**
   - In the left sidebar: "APIs & Services" > "Library"

2. **Enable People API** (Recommended)
   - Search for "People API"
   - Click on "People API"
   - Click "Enable"

3. **Enable Google+ API** (Fallback)
   - Search for "Google+ API"
   - Click on "Google+ API" 
   - Click "Enable"
   - ⚠️ You'll see deprecation warnings - this is normal

### Step 3: Configure OAuth Consent Screen

1. **Go to OAuth Consent Screen**
   - "APIs & Services" > "OAuth consent screen"

2. **Choose User Type**
   - Select "External" (for public app)
   - Click "Create"

3. **Fill App Information**
   ```
   App name: Focus Training Academy
   User support email: your-email@gmail.com
   App logo: (optional - upload your logo)
   App domain: localhost (for development)
   Authorized domains: localhost
   Developer contact: your-email@gmail.com
   ```

4. **Scopes Configuration**
   - Click "Add or Remove Scopes"
   - Add these scopes:
     - `../auth/userinfo.email`
     - `../auth/userinfo.profile`
     - `openid`
   - Click "Update"

5. **Test Users** (for development)
   - Add your email and any test user emails
   - Click "Add Users"

### Step 4: Create OAuth 2.0 Credentials

1. **Go to Credentials**
   - "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"

2. **Configure Application**
   ```
   Application type: Web application
   Name: Focus Training Academy Auth
   ```

3. **Set Authorized Redirect URIs**
   ```
   Development:
   https://localhost:3001/auth/google/callback
   
   Production (when ready):
   https://yourdomain.com/auth/google/callback
   ```

4. **Save and Get Credentials**
   - Click "Create"
   - **Copy Client ID and Client Secret immediately**

### Step 5: Update Environment Variables

Add to `packages/auth-service/.env`:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-actual-client-id-here
GOOGLE_CLIENT_SECRET=your-actual-client-secret-here
```

## 🚨 Critical Implementation Gaps Identified

### Gap 1: Passport Strategy Configuration Issue

Our current implementation has a potential issue with Google+ API deprecation. Let me fix this:

**Problem**: Using deprecated Google+ API
**Solution**: Update to use People API with proper scopes

### Gap 2: Missing Error Handling for API Deprecation

**Problem**: No fallback if Google+ API fails
**Solution**: Implement graceful degradation

### Gap 3: Incomplete Profile Data Mapping

**Problem**: Google profile structure may vary
**Solution**: Robust profile data extraction

## 🔧 Implementation Fixes Needed

### Fix 1: Update Google Strategy Configuration

The current implementation needs these updates:

```javascript
// Current (potentially problematic)
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.BASE_URL}/auth/google/callback`,
  scope: ['profile', 'email']  // This uses deprecated Google+ API
}

// Updated (recommended)
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.BASE_URL}/auth/google/callback`,
  scope: ['profile', 'email', 'openid'],  // More explicit scopes
  accessType: 'offline',  // For refresh tokens if needed
  prompt: 'consent'  // Ensure consent screen shows
}
```

### Fix 2: Robust Profile Data Extraction

```javascript
// Enhanced profile handling
const oauthProfile = {
  id: profile.id,
  email: profile.emails?.[0]?.value || profile._json?.email || '',
  name: profile.displayName || profile._json?.name || '',
  picture: profile.photos?.[0]?.value || profile._json?.picture || '',
  provider: 'google'
};
```

## 🧪 Testing Your Setup

### 1. Test API Access
```bash
# Check if APIs are enabled
curl "https://www.googleapis.com/oauth2/v1/userinfo?access_token=YOUR_TOKEN"
```

### 2. Test OAuth Flow
1. Start auth service: `cd packages/auth-service && npm run dev`
2. Visit: `https://localhost:3001/auth/google`
3. Should redirect to Google consent screen
4. After consent, should redirect back with user data

### 3. Verify Database Integration
- Check if user is created in `users` table
- Verify user profile is created in `user_profiles` table
- Confirm JWT tokens are generated

## 🚨 Additional Gaps Found in Overall Implementation

### Gap 1: Missing HTTPS Development Setup
**Issue**: OAuth requires HTTPS, but we haven't set up local HTTPS
**Impact**: OAuth callbacks will fail in development
**Solution**: Need to implement mkcert setup

### Gap 2: Database Not Running
**Issue**: PostgreSQL and Redis not configured for development
**Impact**: Authentication service won't start
**Solution**: Need Docker setup or local database installation

### Gap 3: Missing Environment Variable Validation
**Issue**: No validation if required OAuth credentials are present
**Impact**: Service starts but OAuth fails silently
**Solution**: Add startup validation

### Gap 4: No OAuth Error Handling UI
**Issue**: If OAuth fails, user sees generic error
**Impact**: Poor user experience
**Solution**: Need error handling pages

## 🔄 Next Immediate Actions Required

1. **Enable Google APIs** (People API + Google+ API)
2. **Create OAuth credentials** with correct redirect URIs
3. **Update environment variables** with real credentials
4. **Set up local HTTPS** for development
5. **Start PostgreSQL and Redis** services
6. **Test complete OAuth flow** end-to-end

## 📞 Support Resources

- **Google OAuth 2.0 Documentation**: https://developers.google.com/identity/protocols/oauth2
- **People API Documentation**: https://developers.google.com/people
- **OAuth Playground**: https://developers.google.com/oauthplayground/
- **Google Cloud Console**: https://console.cloud.google.com/

Would you like me to implement the fixes for the identified gaps immediately?