/**
 * ============================================
 * Logger Module
 * ============================================
 * Centralized logging using Winston.
 */

const winston = require('winston');
const config = require('./config');

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack, ...metadata }) => {
        let log = `${timestamp} [BOT] [${level.toUpperCase()}]: ${message}`;
        
        // Add metadata if present
        if (Object.keys(metadata).length > 0) {
            log += ` ${JSON.stringify(metadata)}`;
        }
        
        // Add stack trace for errors
        if (stack) {
            log += `\n${stack}`;
        }
        
        return log;
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: config.logging.level,
    format: logFormat,
    transports: [
        // Console transport with colors
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        })
    ]
});

module.exports = logger;
