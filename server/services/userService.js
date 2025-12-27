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

// ============================================
// Admin & Approval Functions
// ============================================

const ADMIN_TELEGRAM_ID = 6737328498;

/**
 * Check if a telegram ID is the admin
 * @param {number} telegramId - Telegram user ID
 * @returns {boolean} True if admin
 */
const isAdmin = (telegramId) => {
    return telegramId === ADMIN_TELEGRAM_ID;
};

/**
 * Check if user is approved
 * @param {number} telegramId - Telegram user ID
 * @returns {Promise<boolean>} True if approved
 */
const isApproved = async (telegramId) => {
    // Admin is always approved
    if (isAdmin(telegramId)) return true;
    
    const result = await db.query(
        'SELECT is_approved FROM users WHERE telegram_id = $1',
        [telegramId]
    );
    return result.rows[0]?.is_approved === true;
};

/**
 * Request access for a user
 * @param {number} telegramId - Telegram user ID
 * @returns {Promise<Object>} Updated user
 */
const requestAccess = async (telegramId) => {
    const result = await db.query(
        `UPDATE users 
         SET access_requested = TRUE
         WHERE telegram_id = $1
         RETURNING *`,
        [telegramId]
    );
    
    logger.info('User requested access', { telegramId });
    return result.rows[0];
};

/**
 * Approve a user
 * @param {number} telegramId - Telegram user ID to approve
 * @param {number} approvedBy - Admin telegram ID
 * @returns {Promise<Object>} Updated user
 */
const approveUser = async (telegramId, approvedBy) => {
    const result = await db.query(
        `UPDATE users 
         SET is_approved = TRUE, 
             access_requested = FALSE,
             approved_at = CURRENT_TIMESTAMP,
             approved_by = $2
         WHERE telegram_id = $1
         RETURNING *`,
        [telegramId, approvedBy]
    );
    
    logger.info('User approved', { telegramId, approvedBy });
    return result.rows[0];
};

/**
 * Deny/remove user access
 * @param {number} telegramId - Telegram user ID
 * @returns {Promise<Object>} Updated user
 */
const denyUser = async (telegramId) => {
    const result = await db.query(
        `UPDATE users 
         SET is_approved = FALSE, 
             access_requested = FALSE
         WHERE telegram_id = $1
         RETURNING *`,
        [telegramId]
    );
    
    logger.info('User access denied', { telegramId });
    return result.rows[0];
};

/**
 * Get all pending access requests
 * @returns {Promise<Array>} Users requesting access
 */
const getPendingRequests = async () => {
    const result = await db.query(
        `SELECT * FROM users 
         WHERE access_requested = TRUE AND is_approved = FALSE
         ORDER BY created_at DESC`
    );
    return result.rows;
};

/**
 * Get all users with their session and media counts
 * @returns {Promise<Array>} Users with data counts
 */
const getAllUsersWithData = async () => {
    const result = await db.query(`
        SELECT 
            u.*,
            COUNT(DISTINCT s.id) as session_count,
            COUNT(DISTINCT m.id) as media_count
        FROM users u
        LEFT JOIN sessions s ON u.id = s.user_id
        LEFT JOIN media m ON s.id = m.session_id
        GROUP BY u.id
        ORDER BY u.created_at DESC
    `);
    return result.rows;
};

/**
 * Get user sessions with their media
 * @param {number} telegramId - Telegram user ID
 * @returns {Promise<Object>} User with sessions and media
 */
const getUserSessionsWithMedia = async (telegramId) => {
    // First get the user
    const user = await findByTelegramId(telegramId);
    if (!user) return null;
    
    // Get sessions
    const sessionsResult = await db.query(
        `SELECT * FROM sessions 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [user.id]
    );
    
    const sessions = [];
    for (const session of sessionsResult.rows) {
        // Get media for each session
        const mediaResult = await db.query(
            `SELECT * FROM media 
             WHERE session_id = $1 
             ORDER BY created_at DESC`,
            [session.id]
        );
        
        sessions.push({
            ...session,
            media: mediaResult.rows
        });
    }
    
    return {
        user,
        sessions
    };
};

module.exports = {
    findByTelegramId,
    findById,
    create,
    findOrCreate,
    update,
    getAll,
    // Admin functions
    isAdmin,
    isApproved,
    requestAccess,
    approveUser,
    denyUser,
    getPendingRequests,
    getAllUsersWithData,
    getUserSessionsWithMedia,
    ADMIN_TELEGRAM_ID
};
