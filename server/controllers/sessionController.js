/**
 * ============================================
 * Session Controller
 * ============================================
 * Handles HTTP requests for session operations.
 */

const { sessionService, userService } = require('../services');
const logger = require('../utils/logger');

/**
 * Create a new session
 * POST /api/sessions
 */
const createSession = async (req, res, next) => {
    try {
        const { telegramId, username, firstName, lastName, permissionType } = req.body;
        
        // Validate required fields
        if (!telegramId) {
            return res.status(400).json({ 
                error: 'Missing required field: telegramId' 
            });
        }
        
        if (!permissionType) {
            return res.status(400).json({ 
                error: 'Missing required field: permissionType' 
            });
        }
        
        // Find or create user
        const user = await userService.findOrCreate({
            telegramId,
            username,
            firstName,
            lastName
        });
        
        // Create session
        const session = await sessionService.create(user.id, permissionType);
        
        // Generate web link
        const webLink = sessionService.generateWebLink(session.token);
        
        res.status(201).json({
            success: true,
            session: {
                id: session.id,
                token: session.token,
                permissionType: session.permission_type,
                status: session.status,
                createdAt: session.created_at,
                expiresAt: session.expires_at,
                webLink
            }
        });
        
    } catch (error) {
        logger.error('Error creating session', { error: error.message });
        next(error);
    }
};

/**
 * Get session by token
 * GET /api/sessions/token/:token
 */
const getSessionByToken = async (req, res, next) => {
    try {
        const { token } = req.params;
        
        const session = await sessionService.findByToken(token);
        
        if (!session) {
            return res.status(404).json({ 
                error: 'Session not found' 
            });
        }
        
        // Check if expired
        const isExpired = new Date() > new Date(session.expires_at);
        
        res.json({
            success: true,
            session: {
                id: session.id,
                permissionType: session.permission_type,
                status: isExpired ? 'expired' : session.status,
                createdAt: session.created_at,
                expiresAt: session.expires_at,
                isExpired
            }
        });
        
    } catch (error) {
        logger.error('Error getting session', { error: error.message });
        next(error);
    }
};

/**
 * Get session by ID
 * GET /api/sessions/:id
 */
const getSession = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const session = await sessionService.findById(id);
        
        if (!session) {
            return res.status(404).json({ 
                error: 'Session not found' 
            });
        }
        
        // Get media count
        const { mediaService } = require('../services');
        const mediaCounts = await mediaService.getCountBySession(id);
        
        res.json({
            success: true,
            session: {
                id: session.id,
                token: session.token,
                permissionType: session.permission_type,
                status: session.status,
                createdAt: session.created_at,
                activatedAt: session.activated_at,
                endedAt: session.ended_at,
                expiresAt: session.expires_at,
                user: {
                    telegramId: session.telegram_id,
                    username: session.username,
                    firstName: session.first_name
                },
                mediaCounts
            }
        });
        
    } catch (error) {
        logger.error('Error getting session', { error: error.message });
        next(error);
    }
};

/**
 * Activate a session
 * POST /api/sessions/:id/activate
 */
const activateSession = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Validate session exists
        const session = await sessionService.findById(id);
        if (!session) {
            return res.status(404).json({ 
                error: 'Session not found' 
            });
        }
        
        // Check if can be activated
        if (session.status !== 'created') {
            return res.status(400).json({ 
                error: `Cannot activate session with status: ${session.status}` 
            });
        }
        
        // Check if expired
        if (new Date() > new Date(session.expires_at)) {
            await sessionService.updateStatus(id, 'expired');
            return res.status(400).json({ 
                error: 'Session has expired' 
            });
        }
        
        const activated = await sessionService.activate(id);
        
        res.json({
            success: true,
            session: {
                id: activated.id,
                status: activated.status,
                activatedAt: activated.activated_at
            }
        });
        
    } catch (error) {
        logger.error('Error activating session', { error: error.message });
        next(error);
    }
};

/**
 * End a session
 * POST /api/sessions/:id/end
 */
const endSession = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Validate session exists
        const session = await sessionService.findById(id);
        if (!session) {
            return res.status(404).json({ 
                error: 'Session not found' 
            });
        }
        
        // Check if can be ended
        if (!['created', 'active'].includes(session.status)) {
            return res.status(400).json({ 
                error: `Cannot end session with status: ${session.status}` 
            });
        }
        
        const ended = await sessionService.end(id);
        
        res.json({
            success: true,
            session: {
                id: ended.id,
                status: ended.status,
                endedAt: ended.ended_at
            }
        });
        
    } catch (error) {
        logger.error('Error ending session', { error: error.message });
        next(error);
    }
};

/**
 * Get session events
 * GET /api/sessions/:id/events
 */
const getSessionEvents = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Validate session exists
        const session = await sessionService.findById(id);
        if (!session) {
            return res.status(404).json({ 
                error: 'Session not found' 
            });
        }
        
        const events = await sessionService.getEvents(id);
        
        res.json({
            success: true,
            events
        });
        
    } catch (error) {
        logger.error('Error getting session events', { error: error.message });
        next(error);
    }
};

module.exports = {
    createSession,
    getSessionByToken,
    getSession,
    activateSession,
    endSession,
    getSessionEvents
};
