/**
 * ============================================
 * Session Service
 * ============================================
 * Handles all session-related database operations and business logic.
 */

const db = require('../db');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Create a new session
 * @param {string} userId - User UUID
 * @param {string} permissionType - Type of permission requested
 * @returns {Promise<Object>} Created session
 */
const create = async (userId, permissionType) => {
    // Validate permission type
    if (!config.session.permissionTypes.includes(permissionType)) {
        throw new Error(`Invalid permission type: ${permissionType}`);
    }
    
    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + config.session.expiryMinutes);
    
    const result = await db.query(
        `INSERT INTO sessions (user_id, permission_type, expires_at)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, permissionType, expiresAt]
    );
    
    const session = result.rows[0];
    
    // Create session created event
    await createEvent(session.id, 'session_created', {
        permissionType,
        expiresAt
    });
    
    logger.info('Session created', { 
        sessionId: session.id,
        token: session.token,
        permissionType 
    });
    
    return session;
};

/**
 * Find session by token
 * @param {string} token - Session token (UUID)
 * @returns {Promise<Object|null>} Session object or null
 */
const findByToken = async (token) => {
    const result = await db.query(
        `SELECT s.*, u.telegram_id, u.username, u.first_name
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.token = $1`,
        [token]
    );
    return result.rows[0] || null;
};

/**
 * Find session by ID
 * @param {string} id - Session UUID
 * @returns {Promise<Object|null>} Session object or null
 */
const findById = async (id) => {
    const result = await db.query(
        `SELECT s.*, u.telegram_id, u.username, u.first_name
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.id = $1`,
        [id]
    );
    return result.rows[0] || null;
};

/**
 * Validate session for data upload
 * @param {string} sessionId - Session UUID
 * @returns {Promise<Object>} Validation result
 */
const validate = async (sessionId) => {
    const session = await findById(sessionId);
    
    if (!session) {
        return { valid: false, error: 'Session not found' };
    }
    
    // Check if session is expired
    if (new Date() > new Date(session.expires_at)) {
        // Mark as expired if not already
        if (session.status !== 'expired') {
            await updateStatus(sessionId, 'expired');
        }
        return { valid: false, error: 'Session has expired' };
    }
    
    // Check if session has ended
    if (session.status === 'ended') {
        return { valid: false, error: 'Session has ended' };
    }
    
    // Check if session is in valid state
    if (!['created', 'active'].includes(session.status)) {
        return { valid: false, error: `Invalid session status: ${session.status}` };
    }
    
    return { valid: true, session };
};

/**
 * Update session status
 * @param {string} id - Session UUID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated session
 */
const updateStatus = async (id, status) => {
    if (!config.session.statuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
    }
    
    const updateFields = { status };
    
    // Set additional fields based on status
    if (status === 'active') {
        updateFields.activatedAt = new Date();
    } else if (status === 'ended' || status === 'expired') {
        updateFields.endedAt = new Date();
    }
    
    const result = await db.query(
        `UPDATE sessions 
         SET status = $2,
             activated_at = COALESCE($3, activated_at),
             ended_at = COALESCE($4, ended_at)
         WHERE id = $1
         RETURNING *`,
        [id, status, updateFields.activatedAt, updateFields.endedAt]
    );
    
    logger.info('Session status updated', { sessionId: id, status });
    
    return result.rows[0];
};

/**
 * Activate a session (when user grants permission)
 * @param {string} id - Session UUID
 * @returns {Promise<Object>} Activated session
 */
const activate = async (id) => {
    const session = await updateStatus(id, 'active');
    await createEvent(id, 'session_activated', {});
    return session;
};

/**
 * End a session
 * @param {string} id - Session UUID
 * @returns {Promise<Object>} Ended session
 */
const end = async (id) => {
    const session = await updateStatus(id, 'ended');
    await createEvent(id, 'session_ended', {});
    return session;
};

/**
 * Get sessions for a user
 * @param {string} userId - User UUID
 * @param {number} limit - Number of sessions to return
 * @returns {Promise<Array>} Array of sessions
 */
const getByUserId = async (userId, limit = 20) => {
    const result = await db.query(
        `SELECT * FROM sessions 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [userId, limit]
    );
    return result.rows;
};

/**
 * Get active sessions for a user
 * @param {string} userId - User UUID
 * @returns {Promise<Array>} Array of active sessions
 */
const getActiveByUserId = async (userId) => {
    const result = await db.query(
        `SELECT * FROM sessions 
         WHERE user_id = $1 
         AND status IN ('created', 'active')
         AND expires_at > NOW()
         ORDER BY created_at DESC`,
        [userId]
    );
    return result.rows;
};

/**
 * Create a session event
 * @param {string} sessionId - Session UUID
 * @param {string} eventType - Type of event
 * @param {Object} payload - Event payload
 * @returns {Promise<Object>} Created event
 */
const createEvent = async (sessionId, eventType, payload = {}) => {
    const result = await db.query(
        `INSERT INTO events (session_id, event_type, payload)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [sessionId, eventType, JSON.stringify(payload)]
    );
    
    logger.debug('Event created', { sessionId, eventType });
    
    return result.rows[0];
};

/**
 * Get events for a session
 * @param {string} sessionId - Session UUID
 * @returns {Promise<Array>} Array of events
 */
const getEvents = async (sessionId) => {
    const result = await db.query(
        `SELECT * FROM events 
         WHERE session_id = $1 
         ORDER BY created_at ASC`,
        [sessionId]
    );
    return result.rows;
};

/**
 * Expire old sessions
 * @returns {Promise<number>} Number of expired sessions
 */
const expireOldSessions = async () => {
    const result = await db.query(
        `UPDATE sessions 
         SET status = 'expired', ended_at = NOW()
         WHERE status IN ('created', 'active')
         AND expires_at < NOW()
         RETURNING id`
    );
    
    if (result.rowCount > 0) {
        logger.info('Expired old sessions', { count: result.rowCount });
    }
    
    return result.rowCount;
};

/**
 * Generate web link for a session
 * @param {string} token - Session token
 * @returns {string} Web link URL
 */
const generateWebLink = (token) => {
    return `${config.webClient.baseUrl}/s/${token}`;
};

module.exports = {
    create,
    findByToken,
    findById,
    validate,
    updateStatus,
    activate,
    end,
    getByUserId,
    getActiveByUserId,
    createEvent,
    getEvents,
    expireOldSessions,
    generateWebLink
};
