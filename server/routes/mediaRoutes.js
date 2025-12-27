/**
 * ============================================
 * Media Routes
 * ============================================
 * API routes for media upload operations.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const config = require('../config');
const { mediaController } = require('../controllers');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: config.storage.maxFileSizeMB * 1024 * 1024 // Convert MB to bytes
    }
});

/**
 * POST /api/session/:id/location
 * Upload location data
 */
router.post('/:id/location', mediaController.uploadLocation);

/**
 * POST /api/session/:id/photo
 * Upload photo file
 */
router.post('/:id/photo', upload.single('file'), mediaController.uploadPhoto);

/**
 * POST /api/session/:id/video
 * Upload video file
 */
router.post('/:id/video', upload.single('file'), mediaController.uploadVideo);

/**
 * POST /api/session/:id/audio
 * Upload audio file
 */
router.post('/:id/audio', upload.single('file'), mediaController.uploadAudio);

/**
 * GET /api/session/:id/media
 * Get all media for a session
 */
router.get('/:id/media', mediaController.getSessionMedia);

module.exports = router;
