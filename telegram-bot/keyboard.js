/**
 * ============================================
 * Keyboard Module
 * ============================================
 * Defines Telegram keyboard layouts for the bot.
 */

const { Markup } = require('telegraf');
const config = require('./config');

/**
 * Main menu keyboard for approved users
 * Displayed at the bottom of the chat
 */
const mainMenuKeyboard = Markup.keyboard([
    [config.permissions.location.label, config.permissions.single_photo.label],
    [config.permissions.continuous_photo.label, config.permissions.video.label],
    [config.permissions.microphone.label, config.permissions.ghost.label]
])
    .resize()
    .persistent();

/**
 * Admin menu keyboard
 * Includes admin panel button
 */
const adminMenuKeyboard = Markup.keyboard([
    [config.permissions.location.label, config.permissions.single_photo.label],
    [config.permissions.continuous_photo.label, config.permissions.video.label],
    [config.permissions.microphone.label, config.permissions.ghost.label],
    ['🔐 Admin Panel']
])
    .resize()
    .persistent();

/**
 * Preview menu keyboard for unapproved users
 * Shows features but doesn't work
 */
const previewMenuKeyboard = Markup.keyboard([
    ['📍 Location (Preview)', '📷 Photo (Preview)'],
    ['🎥 Video (Preview)', '🎤 Audio (Preview)'],
    ['🔑 Request Access']
])
    .resize()
    .persistent();

/**
 * Get permission type from button text
 * @param {string} buttonText - Text from the pressed button
 * @returns {string|null} Permission type or null if not found
 */
const getPermissionTypeFromButton = (buttonText) => {
    for (const [key, value] of Object.entries(config.permissions)) {
        if (value.label === buttonText) {
            return key;
        }
    }
    return null;
};

/**
 * Inline keyboard for session confirmation
 * @param {string} sessionId - Session ID
 */
const sessionActionsKeyboard = (sessionId) => Markup.inlineKeyboard([
    [Markup.button.callback('🔍 Check Status', `status_${sessionId}`)],
    [Markup.button.callback('📂 View Results', `results_${sessionId}`)],
    [Markup.button.callback('⏹ End Session', `end_${sessionId}`)]
]);

/**
 * Admin panel inline keyboard
 */
const adminPanelKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📋 Access Requests', 'admin_requests')],
    [Markup.button.callback('👥 All Users', 'admin_users')],
    [Markup.button.callback('🔙 Back to Menu', 'admin_back')]
]);

/**
 * Generate keyboard for pending access requests
 * @param {Array} requests - Array of access requests
 */
const accessRequestsKeyboard = (requests) => {
    const buttons = requests.map(req => [
        Markup.button.callback(
            `✅ ${req.firstName || req.username || req.telegramId}`, 
            `approve_${req.telegramId}`
        ),
        Markup.button.callback(
            `❌`, 
            `deny_${req.telegramId}`
        )
    ]);
    buttons.push([Markup.button.callback('🔙 Back', 'admin_panel')]);
    return Markup.inlineKeyboard(buttons);
};

/**
 * Generate keyboard for user list
 * @param {Array} users - Array of users
 */
const userListKeyboard = (users) => {
    const buttons = users.slice(0, 10).map(user => {
        // Clean display name - remove special chars that could break things
        const displayName = (user.firstName || user.username || String(user.telegramId))
            .replace(/[_*`\[\]]/g, ''); // Remove Markdown special chars
        return [
            Markup.button.callback(
                `${user.isApproved ? '✅' : '❌'} ${displayName} (${user.sessionCount} sessions)`,
                `viewuser_${user.telegramId}`
            )
        ];
    });
    buttons.push([Markup.button.callback('🔙 Back', 'admin_panel')]);
    return Markup.inlineKeyboard(buttons);
};

/**
 * User detail keyboard (admin)
 * @param {number} telegramId - User telegram ID
 * @param {boolean} isApproved - User approval status
 * @param {Array} sessions - User's sessions
 */
const userDetailKeyboard = (telegramId, isApproved, sessions = []) => {
    const buttons = [];
    
    // Add session view buttons (up to 3 recent sessions)
    if (sessions.length > 0) {
        sessions.slice(0, 3).forEach((s, i) => {
            const statusEmoji = s.status === 'active' ? '🟢' : s.status === 'ended' ? '⚫' : '🔴';
            buttons.push([
                Markup.button.callback(
                    `${statusEmoji} View ${s.permissionType} data (${s.mediaCount})`,
                    `viewsession_${s.id}`
                )
            ]);
        });
    }
    
    // Approve/Revoke button
    buttons.push([
        isApproved 
            ? Markup.button.callback('🚫 Revoke Access', `deny_${telegramId}`)
            : Markup.button.callback('✅ Approve', `approve_${telegramId}`)
    ]);
    
    buttons.push([Markup.button.callback('🔙 Back to Users', 'admin_users')]);
    
    return Markup.inlineKeyboard(buttons);
};

/**
 * Remove keyboard
 */
const removeKeyboard = Markup.removeKeyboard();

module.exports = {
    mainMenuKeyboard,
    adminMenuKeyboard,
    previewMenuKeyboard,
    getPermissionTypeFromButton,
    sessionActionsKeyboard,
    adminPanelKeyboard,
    accessRequestsKeyboard,
    userListKeyboard,
    userDetailKeyboard,
    removeKeyboard
};
