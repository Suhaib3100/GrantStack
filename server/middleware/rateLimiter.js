/**
 * ============================================
 * Rate Limiter Middleware
 * ============================================
 * Implements rate limiting for API endpoints.
 */

const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
        success: false,
        error: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn('Rate limit exceeded', {
            ip: req.ip,
            path: req.path
        });
        res.status(options.statusCode).json(options.message);
    }
});

/**
 * Stricter rate limiter for upload endpoints
 */
const uploadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 uploads per minute per session
    keyGenerator: (req) => {
        // Use session ID as key for upload limiting
        return req.params.id || req.ip;
    },
    message: {
        success: false,
        error: 'Too many uploads, please slow down.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn('Upload rate limit exceeded', {
            sessionId: req.params.id,
            ip: req.ip
        });
        res.status(options.statusCode).json(options.message);
    }
});

/**
 * Session creation rate limiter
 */
const sessionCreationLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 session creations per minute
    message: {
        success: false,
        error: 'Too many sessions created, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    apiLimiter,
    uploadLimiter,
    sessionCreationLimiter
};
