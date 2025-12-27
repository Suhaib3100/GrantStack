/**
 * ============================================
 * Error Handler Middleware
 * ============================================
 * Centralized error handling for the API.
 */

const logger = require('../utils/logger');
const config = require('../config');

/**
 * Not Found Handler
 * Handles 404 errors for undefined routes
 */
const notFoundHandler = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.status = 404;
    next(error);
};

/**
 * Error Handler
 * Handles all errors passed through next(error)
 */
const errorHandler = (err, req, res, next) => {
    // Determine status code
    const statusCode = err.status || err.statusCode || 500;
    
    // Log error
    logger.error('Request error', {
        method: req.method,
        url: req.originalUrl,
        status: statusCode,
        error: err.message,
        stack: config.server.isProduction ? undefined : err.stack
    });
    
    // Send error response
    res.status(statusCode).json({
        success: false,
        error: err.message || 'Internal Server Error',
        ...(config.server.isProduction ? {} : { stack: err.stack })
    });
};

/**
 * Multer Error Handler
 * Handles file upload errors
 */
const multerErrorHandler = (err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            error: `File too large. Maximum size is ${config.storage.maxFileSizeMB}MB`
        });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            success: false,
            error: 'Unexpected file field'
        });
    }
    
    next(err);
};

module.exports = {
    notFoundHandler,
    errorHandler,
    multerErrorHandler
};
