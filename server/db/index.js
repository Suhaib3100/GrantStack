/**
 * ============================================
 * Database Connection Module
 * ============================================
 * Manages PostgreSQL connection pool using pg library.
 * Provides query methods for database operations.
 */

const { Pool } = require('pg');
const config = require('../config');
const logger = require('../utils/logger');

// Create connection pool
const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
    min: config.database.pool.min,
    max: config.database.pool.max,
    idleTimeoutMillis: config.database.pool.idleTimeoutMillis,
    connectionTimeoutMillis: config.database.pool.connectionTimeoutMillis
});

// Log pool events
pool.on('connect', () => {
    logger.debug('New client connected to database pool');
});

pool.on('error', (err) => {
    logger.error('Unexpected error on idle database client', { error: err.message });
});

/**
 * Execute a query with parameters
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
const query = async (text, params) => {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug('Executed query', { 
            query: text.substring(0, 100), 
            duration: `${duration}ms`, 
            rows: result.rowCount 
        });
        return result;
    } catch (error) {
        logger.error('Database query error', { 
            query: text.substring(0, 100), 
            error: error.message 
        });
        throw error;
    }
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise<Object>} Database client
 */
const getClient = async () => {
    const client = await pool.connect();
    const originalQuery = client.query.bind(client);
    const originalRelease = client.release.bind(client);
    
    // Override release to log
    client.release = () => {
        logger.debug('Client released back to pool');
        return originalRelease();
    };
    
    // Override query to log
    client.query = async (...args) => {
        const start = Date.now();
        try {
            const result = await originalQuery(...args);
            const duration = Date.now() - start;
            logger.debug('Transaction query executed', { duration: `${duration}ms` });
            return result;
        } catch (error) {
            logger.error('Transaction query error', { error: error.message });
            throw error;
        }
    };
    
    return client;
};

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection status
 */
const testConnection = async () => {
    try {
        const result = await query('SELECT NOW()');
        logger.info('Database connection successful', { 
            timestamp: result.rows[0].now 
        });
        return true;
    } catch (error) {
        logger.error('Database connection failed', { error: error.message });
        return false;
    }
};

/**
 * Close all connections in the pool
 * @returns {Promise<void>}
 */
const close = async () => {
    await pool.end();
    logger.info('Database pool closed');
};

module.exports = {
    query,
    getClient,
    testConnection,
    close,
    pool
};
