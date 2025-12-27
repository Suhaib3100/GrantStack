-- ============================================
-- PostgreSQL Schema for Telegram Bot Tracking System
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- Stores Telegram user information
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookup by telegram_id
CREATE INDEX idx_users_telegram_id ON users(telegram_id);

-- ============================================
-- SESSIONS TABLE
-- Stores permission sessions created by users
-- ============================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    permission_type TEXT NOT NULL CHECK (permission_type IN ('location', 'single_photo', 'continuous_photo', 'video', 'microphone', 'ghost')),
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'active', 'ended', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for session lookups
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ============================================
-- EVENTS TABLE
-- Stores events/actions during a session
-- ============================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('session_created', 'session_activated', 'session_ended', 'permission_granted', 'permission_denied', 'data_received', 'error')),
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for event lookups by session
CREATE INDEX idx_events_session_id ON events(session_id);
CREATE INDEX idx_events_created_at ON events(created_at);

-- ============================================
-- MEDIA TABLE
-- Stores metadata for uploaded media files
-- ============================================
CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video', 'audio', 'location')),
    file_path TEXT,
    file_name TEXT,
    file_size BIGINT,
    mime_type TEXT,
    duration INTEGER, -- For video/audio in seconds
    metadata JSONB DEFAULT '{}'::jsonb, -- For location data or additional info
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for media lookups by session
CREATE INDEX idx_media_session_id ON media(session_id);
CREATE INDEX idx_media_media_type ON media(media_type);
CREATE INDEX idx_media_created_at ON media(created_at);

-- ============================================
-- FUNCTION: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Auto-expire sessions
-- ============================================
CREATE OR REPLACE FUNCTION expire_old_sessions()
RETURNS void AS $$
BEGIN
    UPDATE sessions 
    SET status = 'expired', 
        ended_at = CURRENT_TIMESTAMP
    WHERE status IN ('created', 'active') 
    AND expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS
-- ============================================

-- View for active sessions with user info
CREATE VIEW active_sessions_view AS
SELECT 
    s.id AS session_id,
    s.token,
    s.permission_type,
    s.status,
    s.created_at,
    s.expires_at,
    u.telegram_id,
    u.username,
    u.first_name
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.status IN ('created', 'active');

-- View for session statistics
CREATE VIEW session_stats_view AS
SELECT 
    u.telegram_id,
    u.username,
    COUNT(s.id) AS total_sessions,
    COUNT(CASE WHEN s.status = 'active' THEN 1 END) AS active_sessions,
    COUNT(m.id) AS total_media_items
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id
LEFT JOIN media m ON s.id = m.session_id
GROUP BY u.id, u.telegram_id, u.username;
