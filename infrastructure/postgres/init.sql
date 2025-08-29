-- Initialize Focus Training Academy Database
-- This script sets up the initial database structure

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas for different services
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS challenges;
CREATE SCHEMA IF NOT EXISTS gamification;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS billing;

-- Grant permissions
GRANT USAGE ON SCHEMA auth TO focus_user;
GRANT USAGE ON SCHEMA users TO focus_user;
GRANT USAGE ON SCHEMA challenges TO focus_user;
GRANT USAGE ON SCHEMA gamification TO focus_user;
GRANT USAGE ON SCHEMA analytics TO focus_user;
GRANT USAGE ON SCHEMA billing TO focus_user;

GRANT CREATE ON SCHEMA auth TO focus_user;
GRANT CREATE ON SCHEMA users TO focus_user;
GRANT CREATE ON SCHEMA challenges TO focus_user;
GRANT CREATE ON SCHEMA gamification TO focus_user;
GRANT CREATE ON SCHEMA analytics TO focus_user;
GRANT CREATE ON SCHEMA billing TO focus_user;