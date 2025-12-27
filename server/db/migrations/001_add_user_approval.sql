-- ============================================
-- Migration: Add user approval system
-- ============================================

-- Add approval status to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS access_requested BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by BIGINT;

-- Create index for faster approval status lookups
CREATE INDEX IF NOT EXISTS idx_users_is_approved ON users(is_approved);
CREATE INDEX IF NOT EXISTS idx_users_access_requested ON users(access_requested);

-- Set admin user as approved (telegram_id: 6737328498)
UPDATE users SET is_approved = TRUE WHERE telegram_id = 6737328498;
