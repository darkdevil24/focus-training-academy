export interface User {
  id: string;
  email: string;
  oauth_provider: string;
  oauth_id: string;
  organization_id?: string;
  subscription_tier: 'free' | 'premium' | 'enterprise';
  created_at: Date;
  updated_at: Date;
  last_active_at?: Date;
  is_active: boolean;
}

export interface UserSession {
  userId: string;
  email: string;
  roles: Role[];
  permissions: Permission[];
  organizationId?: string;
  expiresAt: Date;
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
}

export interface AuthResult {
  user: User;
  tokens: TokenPair;
  isNewUser: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface OAuthProfile {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  provider: OAuthProvider;
}

export type OAuthProvider = 'google' | 'microsoft' | 'facebook' | 'apple';

export interface MFASetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface MFAVerification {
  userId: string;
  token: string;
  isValid: boolean;
}

export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  organizationId?: string;
  iat: number;
  exp: number;
}