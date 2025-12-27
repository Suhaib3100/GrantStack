/**
 * ============================================
 * Session Routes
 * ============================================
 * API routes for session management.
 */

const express = require('express');
const router = express.Router();
const { sessionController } = require('../controllers');

/**
 * POST /api/sessions
 * Create a new session
 */
router.post('/', sessionController.createSession);

/**
 * GET /api/sessions/token/:token
 * Get session by token (for web client)
 */
router.get('/token/:token', sessionController.getSessionByToken);

/**
 * GET /api/sessions/:id
 * Get session by ID
 */
router.get('/:id', sessionController.getSession);

/**
 * POST /api/sessions/:id/activate
 * Activate a session
 */
router.post('/:id/activate', sessionController.activateSession);

/**
 * POST /api/sessions/:id/end
 * End a session
 */
router.post('/:id/end', sessionController.endSession);

/**
 * GET /api/sessions/:id/events
 * Get session events
 */
router.get('/:id/events', sessionController.getSessionEvents);

module.exports = router;
