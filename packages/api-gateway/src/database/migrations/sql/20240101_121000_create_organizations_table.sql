-- Create organizations table
-- This table stores enterprise organization information for B2B customers

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    subscription_plan VARCHAR(50) NOT NULL DEFAULT 'enterprise' CHECK (subscription_plan IN ('enterprise', 'education')),
    max_users INTEGER DEFAULT 50,
    billing_email VARCHAR(255),
    admin_user_id UUID,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique domain if provided
    UNIQUE(domain) WHERE domain IS NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_organizations_name ON organizations(name);
CREATE INDEX idx_organizations_domain ON organizations(domain) WHERE domain IS NOT NULL;
CREATE INDEX idx_organizations_subscription_plan ON organizations(subscription_plan);
CREATE INDEX idx_organizations_admin_user_id ON organizations(admin_user_id) WHERE admin_user_id IS NOT NULL;
CREATE INDEX idx_organizations_created_at ON organizations(created_at);

-- Add trigger to automatically update updated_at timestamp
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraint from users table to organizations
ALTER TABLE users 
ADD CONSTRAINT fk_users_organization_id 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- Add foreign key constraint for admin user
ALTER TABLE organizations 
ADD CONSTRAINT fk_organizations_admin_user_id 
FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON TABLE organizations IS 'Enterprise organization data for B2B customers';
COMMENT ON COLUMN organizations.id IS 'Unique identifier for the organization';
COMMENT ON COLUMN organizations.name IS 'Organization display name';
COMMENT ON COLUMN organizations.domain IS 'Optional email domain for automatic user assignment';
COMMENT ON COLUMN organizations.subscription_plan IS 'Organization subscription plan type';
COMMENT ON COLUMN organizations.max_users IS 'Maximum number of users allowed in the organization';
COMMENT ON COLUMN organizations.billing_email IS 'Email address for billing and administrative communications';
COMMENT ON COLUMN organizations.admin_user_id IS 'Primary administrator user for the organization';
COMMENT ON COLUMN organizations.settings IS 'Organization-specific configuration and preferences';
COMMENT ON COLUMN organizations.is_active IS 'Whether the organization subscription is active';
COMMENT ON COLUMN organizations.created_at IS 'Timestamp when the organization was created';
COMMENT ON COLUMN organizations.updated_at IS 'Timestamp when the organization was last updated';