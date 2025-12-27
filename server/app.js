/**
 * ============================================
 * Express Application Entry Point
 * ============================================
 * Main server file that sets up Express with all middleware,
 * routes, and starts the HTTP server.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const logger = require('./utils/logger');
const db = require('./db');
const { sessionRoutes, mediaRoutes, adminRoutes } = require('./routes');
const { 
    errorHandler, 
    notFoundHandler, 
    multerErrorHandler,
    apiLimiter 
} = require('./middleware');
const { sessionService, mediaService } = require('./services');

// Create Express app
const app = express();

// ============================================
// Security Middleware
// ============================================

// Helmet for security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configuration
app.use(cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ============================================
// Body Parsing Middleware
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// Rate Limiting
// ============================================

app.use('/api', apiLimiter);

// ============================================
// Request Logging
// ============================================

app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.debug('HTTP Request', {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`
        });
    });
    
    next();
});

// ============================================
// Health Check Endpoint
// ============================================

app.get('/health', async (req, res) => {
    const dbConnected = await db.testConnection();
    
    res.json({
        status: dbConnected ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbConnected ? 'connected' : 'disconnected'
    });
});

// ============================================
// API Routes
// ============================================

// Session management routes
app.use('/api/sessions', sessionRoutes);

// Media upload routes (using /api/session/:id/...)
app.use('/api/session', mediaRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// ============================================
// Error Handling
// ============================================

// Handle multer errors
app.use(multerErrorHandler);

// Handle 404
app.use(notFoundHandler);

// Handle all other errors
app.use(errorHandler);

// ============================================
// Session Expiry Cron Job
// ============================================

// Run session expiry check every minute
const EXPIRY_CHECK_INTERVAL_MS = 60 * 1000;

setInterval(async () => {
    try {
        await sessionService.expireOldSessions();
    } catch (error) {
        logger.error('Error in session expiry job', { error: error.message });
    }
}, EXPIRY_CHECK_INTERVAL_MS);

// ============================================
// Server Startup
// ============================================

const startServer = async () => {
    try {
        // Test database connection
        const dbConnected = await db.testConnection();
        if (!dbConnected) {
            throw new Error('Failed to connect to database');
        }
        
        // Ensure storage directories exist
        await mediaService.ensureStorageDirectories();
        
        // Start HTTP server
        app.listen(config.server.port, () => {
            logger.info('Server started', {
                port: config.server.port,
                environment: config.server.nodeEnv,
                corsOrigin: config.cors.origin
            });
        });
        
    } catch (error) {
        logger.error('Failed to start server', { error: error.message });
        process.exit(1);
    }
};

// ============================================
// Graceful Shutdown
// ============================================

const shutdown = async () => {
    logger.info('Shutting down server...');
    
    try {
        await db.close();
        logger.info('Database connections closed');
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown', { error: error.message });
        process.exit(1);
    }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
startServer();

module.exports = app;
