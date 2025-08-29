-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(role_id, permission_id)
);

-- Create user_roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    
    UNIQUE(user_id, role_id)
);

-- Create MFA table
CREATE TABLE IF NOT EXISTS user_mfa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    secret VARCHAR(255) NOT NULL,
    backup_codes JSONB DEFAULT '[]',
    is_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, description) VALUES 
    ('admin', 'System administrator with full access'),
    ('user', 'Regular user with standard access'),
    ('organization_admin', 'Organization administrator')
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (name, resource, action, description) VALUES 
    ('read_users', 'users', 'read', 'Read user information'),
    ('write_users', 'users', 'write', 'Create and update users'),
    ('delete_users', 'users', 'delete', 'Delete users'),
    ('read_organizations', 'organizations', 'read', 'Read organization information'),
    ('write_organizations', 'organizations', 'write', 'Create and update organizations'),
    ('delete_organizations', 'organizations', 'delete', 'Delete organizations'),
    ('manage_roles', 'roles', 'manage', 'Manage user roles and permissions'),
    ('read_analytics', 'analytics', 'read', 'Read analytics and reports'),
    ('manage_billing', 'billing', 'manage', 'Manage billing and subscriptions'),
    ('manage_mfa', 'mfa', 'manage', 'Manage multi-factor authentication')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'user' AND p.name IN ('read_users')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'organization_admin' AND p.name IN ('read_users', 'write_users', 'read_organizations', 'write_organizations', 'read_analytics')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_mfa_user_id ON user_mfa(user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);