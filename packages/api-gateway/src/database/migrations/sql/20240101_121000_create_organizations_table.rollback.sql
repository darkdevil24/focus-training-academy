-- Rollback organizations table creation

-- Remove foreign key constraints
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS fk_organizations_admin_user_id;
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_organization_id;

-- Drop trigger
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;

-- Drop indexes
DROP INDEX IF EXISTS idx_organizations_name;
DROP INDEX IF EXISTS idx_organizations_domain;
DROP INDEX IF EXISTS idx_organizations_subscription_plan;
DROP INDEX IF EXISTS idx_organizations_admin_user_id;
DROP INDEX IF EXISTS idx_organizations_created_at;

-- Drop table
DROP TABLE IF EXISTS organizations;