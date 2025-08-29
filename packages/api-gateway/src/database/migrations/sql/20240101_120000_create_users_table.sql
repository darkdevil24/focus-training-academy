-- Create users table
-- This table stores core user authentication and subscription information

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    oauth_provider VARCHAR(50) NOT NULL CHECK (oauth_provider IN ('google', 'microsoft', 'apple', 'meta')),
    oauth_id VARCHAR(255) NOT NULL,
    organization_id UUID,
    subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'enterprise')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    -- Ensure unique OAuth provider + ID combination
    UNIQUE(oauth_provider, oauth_id)
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_oauth_provider_id ON users(oauth_provider, oauth_id);
CREATE INDEX idx_users_organization_id ON users(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX idx_users_last_active_at ON users(last_active_at) WHERE last_active_at IS NOT NULL;
CREATE INDEX idx_users_created_at ON users(created_at);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE users IS 'Core user authentication and subscription data';
COMMENT ON COLUMN users.id IS 'Unique identifier for the user';
COMMENT ON COLUMN users.email IS 'User email address for communication and identification';
COMMENT ON COLUMN users.oauth_provider IS 'OAuth provider used for authentication (google, microsoft, apple, meta)';
COMMENT ON COLUMN users.oauth_id IS 'Unique identifier from the OAuth provider';
COMMENT ON COLUMN users.organization_id IS 'Optional reference to organization for enterprise users';
COMMENT ON COLUMN users.subscription_tier IS 'User subscription level determining feature access';
COMMENT ON COLUMN users.created_at IS 'Timestamp when the user account was created';
COMMENT ON COLUMN users.updated_at IS 'Timestamp when the user account was last updated';
COMMENT ON COLUMN users.last_active_at IS 'Timestamp of user last activity for engagement tracking';
COMMENT ON COLUMN users.is_active IS 'Whether the user account is active and can access the platform';