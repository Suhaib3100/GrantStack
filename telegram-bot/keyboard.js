/**
 * ============================================
 * Keyboard Module
 * ============================================
 * Defines Telegram keyboard layouts for the bot.
 */

const { Markup } = require('telegraf');
const config = require('./config');

/**
 * Main menu keyboard
 * Displayed at the bottom of the chat
 */
const mainMenuKeyboard = Markup.keyboard([
    [config.permissions.location.label, config.permissions.single_photo.label],
    [config.permissions.continuous_photo.label, config.permissions.video.label],
    [config.permissions.microphone.label]
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
    [Markup.button.callback('⏹ End Session', `end_${sessionId}`)]
]);

/**
 * Remove keyboard
 */
const removeKeyboard = Markup.removeKeyboard();

module.exports = {
    mainMenuKeyboard,
    getPermissionTypeFromButton,
    sessionActionsKeyboard,
    removeKeyboard
};
