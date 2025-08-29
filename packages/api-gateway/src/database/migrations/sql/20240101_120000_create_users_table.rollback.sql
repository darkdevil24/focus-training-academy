-- Rollback users table creation

-- Drop trigger and function
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_oauth_provider_id;
DROP INDEX IF EXISTS idx_users_organization_id;
DROP INDEX IF EXISTS idx_users_subscription_tier;
DROP INDEX IF EXISTS idx_users_last_active_at;
DROP INDEX IF EXISTS idx_users_created_at;

-- Drop table
DROP TABLE IF EXISTS users;