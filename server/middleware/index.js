/**
 * ============================================
 * Middleware Index
 * ============================================
 * Exports all middleware from a single entry point.
 */

const errorHandler = require('./errorHandler');
const rateLimiter = require('./rateLimiter');

module.exports = {
    ...errorHandler,
    ...rateLimiter
};
