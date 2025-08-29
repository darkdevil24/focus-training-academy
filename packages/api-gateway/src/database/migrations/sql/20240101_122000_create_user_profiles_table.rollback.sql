-- Rollback user_profiles table creation

-- Drop trigger
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;

-- Drop indexes
DROP INDEX IF EXISTS idx_user_profiles_user_id;
DROP INDEX IF EXISTS idx_user_profiles_display_name;
DROP INDEX IF EXISTS idx_user_profiles_timezone;
DROP INDEX IF EXISTS idx_user_profiles_preferred_language;
DROP INDEX IF EXISTS idx_user_profiles_onboarding_completed;
DROP INDEX IF EXISTS idx_user_profiles_created_at;

-- Drop table
DROP TABLE IF EXISTS user_profiles;