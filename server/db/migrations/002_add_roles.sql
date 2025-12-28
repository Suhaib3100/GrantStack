-- Migration: Add role system for managers
-- Run this on the database

-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Update existing admin
UPDATE users SET role = 'admin' WHERE telegram_id = '6737328498';

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Roles:
-- 'admin' - Full access to everything
-- 'manager_plus' - Can approve/decline + view encrypted data
-- 'manager' - Can only approve/decline requests
-- 'user' - Regular user
