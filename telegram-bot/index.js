/**
 * ============================================
 * Telegram Bot Entry Point
 * ============================================
 * Main entry file that starts the Telegram bot.
 */

const bot = require('./bot');
const logger = require('./logger');
const api = require('./api');

// ============================================
// Startup
// ============================================

const startBot = async () => {
    logger.info('Starting Telegram bot...');
    
    // Check backend API health
    const isApiHealthy = await api.checkHealth();
    if (!isApiHealthy) {
        logger.warn('Backend API is not healthy. Bot will start but sessions may fail.');
    } else {
        logger.info('Backend API is healthy');
    }
    
    // Start bot with long polling
    await bot.launch();
    
    logger.info('Bot is running!');
    logger.info('Press Ctrl+C to stop');
};

// ============================================
// Graceful Shutdown
// ============================================

const shutdown = (signal) => {
    logger.info(`Received ${signal}. Shutting down...`);
    bot.stop(signal);
    process.exit(0);
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

// ============================================
// Handle Uncaught Errors
// ============================================

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason: reason?.toString() });
});

// ============================================
// Start the Bot
// ============================================

startBot().catch((error) => {
    logger.error('Failed to start bot', { error: error.message });
    process.exit(1);
});
