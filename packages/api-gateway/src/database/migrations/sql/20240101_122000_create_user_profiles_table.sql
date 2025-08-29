-- Create user_profiles table
-- This table stores extended user profile information and preferences

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'UTC',
    preferred_language VARCHAR(10) DEFAULT 'en',
    privacy_settings JSONB DEFAULT '{}',
    notification_preferences JSONB DEFAULT '{}',
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one profile per user
    UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_display_name ON user_profiles(display_name) WHERE display_name IS NOT NULL;
CREATE INDEX idx_user_profiles_timezone ON user_profiles(timezone);
CREATE INDEX idx_user_profiles_preferred_language ON user_profiles(preferred_language);
CREATE INDEX idx_user_profiles_onboarding_completed ON user_profiles(onboarding_completed);
CREATE INDEX idx_user_profiles_created_at ON user_profiles(created_at);

-- Add trigger to automatically update updated_at timestamp
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add default privacy settings structure
ALTER TABLE user_profiles 
ADD CONSTRAINT check_privacy_settings_structure 
CHECK (
    privacy_settings ? 'biometric_processing' AND
    privacy_settings ? 'data_sharing' AND
    privacy_settings ? 'analytics_tracking'
);

-- Add default notification preferences structure
ALTER TABLE user_profiles 
ADD CONSTRAINT check_notification_preferences_structure 
CHECK (
    notification_preferences ? 'email_enabled' AND
    notification_preferences ? 'push_enabled' AND
    notification_preferences ? 'challenge_reminders' AND
    notification_preferences ? 'progress_updates'
);

-- Set default values for JSONB fields
ALTER TABLE user_profiles 
ALTER COLUMN privacy_settings SET DEFAULT '{
    "biometric_processing": true,
    "data_sharing": false,
    "analytics_tracking": true,
    "third_party_integrations": false
}';

ALTER TABLE user_profiles 
ALTER COLUMN notification_preferences SET DEFAULT '{
    "email_enabled": true,
    "push_enabled": false,
    "challenge_reminders": true,
    "progress_updates": true,
    "streak_alerts": true,
    "achievement_notifications": true
}';

-- Add comments for documentation
COMMENT ON TABLE user_profiles IS 'Extended user profile information and preferences';
COMMENT ON COLUMN user_profiles.id IS 'Unique identifier for the user profile';
COMMENT ON COLUMN user_profiles.user_id IS 'Foreign key reference to the users table';
COMMENT ON COLUMN user_profiles.display_name IS 'Optional display name chosen by the user';
COMMENT ON COLUMN user_profiles.timezone IS 'User timezone for scheduling and notifications';
COMMENT ON COLUMN user_profiles.preferred_language IS 'User preferred language for localization';
COMMENT ON COLUMN user_profiles.privacy_settings IS 'User privacy preferences and consent settings';
COMMENT ON COLUMN user_profiles.notification_preferences IS 'User notification preferences across channels';
COMMENT ON COLUMN user_profiles.onboarding_completed IS 'Whether the user has completed the onboarding process';
COMMENT ON COLUMN user_profiles.created_at IS 'Timestamp when the profile was created';
COMMENT ON COLUMN user_profiles.updated_at IS 'Timestamp when the profile was last updated';