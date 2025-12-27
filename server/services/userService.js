/**
 * ============================================
 * User Service
 * ============================================
 * Handles all user-related database operations.
 */

const db = require('../db');
const logger = require('../utils/logger');

/**
 * Find user by Telegram ID
 * @param {number} telegramId - Telegram user ID
 * @returns {Promise<Object|null>} User object or null
 */
const findByTelegramId = async (telegramId) => {
    const result = await db.query(
        'SELECT * FROM users WHERE telegram_id = $1',
        [telegramId]
    );
    return result.rows[0] || null;
};

/**
 * Find user by internal ID
 * @param {string} id - User UUID
 * @returns {Promise<Object|null>} User object or null
 */
const findById = async (id) => {
    const result = await db.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
    );
    return result.rows[0] || null;
};

/**
 * Create a new user
 * @param {Object} userData - User data from Telegram
 * @param {number} userData.telegramId - Telegram user ID
 * @param {string} userData.username - Telegram username
 * @param {string} userData.firstName - User's first name
 * @param {string} userData.lastName - User's last name
 * @returns {Promise<Object>} Created user
 */
const create = async ({ telegramId, username, firstName, lastName }) => {
    const result = await db.query(
        `INSERT INTO users (telegram_id, username, first_name, last_name)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [telegramId, username, firstName, lastName]
    );
    
    logger.info('User created', { 
        userId: result.rows[0].id, 
        telegramId 
    });
    
    return result.rows[0];
};

/**
 * Find or create user by Telegram ID
 * @param {Object} userData - User data from Telegram
 * @returns {Promise<Object>} User object
 */
const findOrCreate = async (userData) => {
    let user = await findByTelegramId(userData.telegramId);
    
    if (!user) {
        user = await create(userData);
    }
    
    return user;
};

/**
 * Update user information
 * @param {string} id - User UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated user
 */
const update = async (id, { username, firstName, lastName }) => {
    const result = await db.query(
        `UPDATE users 
         SET username = COALESCE($2, username),
             first_name = COALESCE($3, first_name),
             last_name = COALESCE($4, last_name)
         WHERE id = $1
         RETURNING *`,
        [id, username, firstName, lastName]
    );
    
    return result.rows[0];
};

/**
 * Get all users with pagination
 * @param {number} limit - Number of users to return
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} Array of users
 */
const getAll = async (limit = 50, offset = 0) => {
    const result = await db.query(
        `SELECT * FROM users 
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
    );
    return result.rows;
};

module.exports = {
    findByTelegramId,
    findById,
    create,
    findOrCreate,
    update,
    getAll
};
