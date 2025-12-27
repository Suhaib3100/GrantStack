/**
 * ============================================
 * Configuration Module
 * ============================================
 * Centralizes all environment variables and configuration settings.
 * No magic constants - everything is configurable.
 */

require('dotenv').config();

const config = {
    // Server configuration
    server: {
        port: parseInt(process.env.PORT, 10) || 3001,
        nodeEnv: process.env.NODE_ENV || 'development',
        isProduction: process.env.NODE_ENV === 'production'
    },

    // Database configuration
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        name: process.env.DB_NAME || 'tg_bot_track',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        // Connection pool settings
        pool: {
            min: 2,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000
        }
    },

    // Session configuration
    session: {
        expiryMinutes: parseInt(process.env.SESSION_EXPIRY_MINUTES, 10) || 30,
        // Valid permission types
        permissionTypes: ['location', 'single_photo', 'continuous_photo', 'video', 'microphone'],
        // Valid session statuses
        statuses: ['created', 'active', 'ended', 'expired']
    },

    // Storage configuration
    storage: {
        basePath: process.env.STORAGE_PATH || './storage',
        photosPath: process.env.PHOTOS_PATH || './storage/photos',
        videosPath: process.env.VIDEOS_PATH || './storage/videos',
        audioPath: process.env.AUDIO_PATH || './storage/audio',
        maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 50,
        // Allowed MIME types for each media type
        allowedMimeTypes: {
            photo: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            video: ['video/mp4', 'video/webm', 'video/quicktime'],
            audio: ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav']
        }
    },

    // Rate limiting configuration
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
    },

    // CORS configuration
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true
    },

    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'debug'
    },

    // Web client URL for generating links
    webClient: {
        baseUrl: process.env.WEB_CLIENT_URL || 'http://localhost:3000'
    }
};

module.exports = config;
