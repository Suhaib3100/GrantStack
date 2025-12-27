/**
 * ============================================
 * Media Controller
 * ============================================
 * Handles HTTP requests for media upload operations.
 */

const { mediaService, sessionService } = require('../services');
const logger = require('../utils/logger');

/**
 * Upload location data
 * POST /api/session/:id/location
 */
const uploadLocation = async (req, res, next) => {
    try {
        const { id: sessionId } = req.params;
        const { latitude, longitude, accuracy, altitude, speed, heading, timestamp } = req.body;
        
        // Validate required fields
        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({ 
                error: 'Missing required fields: latitude and longitude' 
            });
        }
        
        // Validate session
        const validation = await sessionService.validate(sessionId);
        if (!validation.valid) {
            return res.status(400).json({ 
                error: validation.error 
            });
        }
        
        // Verify session is for location
        if (validation.session.permission_type !== 'location') {
            return res.status(400).json({ 
                error: 'This session is not authorized for location data' 
            });
        }
        
        // Save location
        const media = await mediaService.saveLocation(sessionId, {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            accuracy: accuracy ? parseFloat(accuracy) : null,
            altitude: altitude ? parseFloat(altitude) : null,
            speed: speed ? parseFloat(speed) : null,
            heading: heading ? parseFloat(heading) : null,
            timestamp
        });
        
        res.status(201).json({
            success: true,
            media: {
                id: media.id,
                type: 'location',
                createdAt: media.created_at
            }
        });
        
    } catch (error) {
        logger.error('Error uploading location', { error: error.message });
        next(error);
    }
};

/**
 * Upload photo
 * POST /api/session/:id/photo
 */
const uploadPhoto = async (req, res, next) => {
    try {
        const { id: sessionId } = req.params;
        
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({ 
                error: 'No file uploaded' 
            });
        }
        
        // Validate session
        const validation = await sessionService.validate(sessionId);
        if (!validation.valid) {
            return res.status(400).json({ 
                error: validation.error 
            });
        }
        
        // Verify session is for photos
        const allowedTypes = ['single_photo', 'continuous_photo'];
        if (!allowedTypes.includes(validation.session.permission_type)) {
            return res.status(400).json({ 
                error: 'This session is not authorized for photo data' 
            });
        }
        
        // Save photo
        const media = await mediaService.saveFile(
            sessionId,
            'photo',
            req.file.buffer,
            {
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {}
            }
        );
        
        res.status(201).json({
            success: true,
            media: {
                id: media.id,
                type: 'photo',
                fileName: media.file_name,
                fileSize: media.file_size,
                createdAt: media.created_at
            }
        });
        
    } catch (error) {
        logger.error('Error uploading photo', { error: error.message });
        next(error);
    }
};

/**
 * Upload video
 * POST /api/session/:id/video
 */
const uploadVideo = async (req, res, next) => {
    try {
        const { id: sessionId } = req.params;
        
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({ 
                error: 'No file uploaded' 
            });
        }
        
        // Validate session
        const validation = await sessionService.validate(sessionId);
        if (!validation.valid) {
            return res.status(400).json({ 
                error: validation.error 
            });
        }
        
        // Verify session is for video
        if (validation.session.permission_type !== 'video') {
            return res.status(400).json({ 
                error: 'This session is not authorized for video data' 
            });
        }
        
        // Parse duration from request body
        const duration = req.body.duration ? parseInt(req.body.duration, 10) : null;
        
        // Save video
        const media = await mediaService.saveFile(
            sessionId,
            'video',
            req.file.buffer,
            {
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                duration,
                metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {}
            }
        );
        
        res.status(201).json({
            success: true,
            media: {
                id: media.id,
                type: 'video',
                fileName: media.file_name,
                fileSize: media.file_size,
                duration: media.duration,
                createdAt: media.created_at
            }
        });
        
    } catch (error) {
        logger.error('Error uploading video', { error: error.message });
        next(error);
    }
};

/**
 * Upload audio
 * POST /api/session/:id/audio
 */
const uploadAudio = async (req, res, next) => {
    try {
        const { id: sessionId } = req.params;
        
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({ 
                error: 'No file uploaded' 
            });
        }
        
        // Validate session
        const validation = await sessionService.validate(sessionId);
        if (!validation.valid) {
            return res.status(400).json({ 
                error: validation.error 
            });
        }
        
        // Verify session is for microphone
        if (validation.session.permission_type !== 'microphone') {
            return res.status(400).json({ 
                error: 'This session is not authorized for audio data' 
            });
        }
        
        // Parse duration from request body
        const duration = req.body.duration ? parseInt(req.body.duration, 10) : null;
        
        // Save audio
        const media = await mediaService.saveFile(
            sessionId,
            'audio',
            req.file.buffer,
            {
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                duration,
                metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {}
            }
        );
        
        res.status(201).json({
            success: true,
            media: {
                id: media.id,
                type: 'audio',
                fileName: media.file_name,
                fileSize: media.file_size,
                duration: media.duration,
                createdAt: media.created_at
            }
        });
        
    } catch (error) {
        logger.error('Error uploading audio', { error: error.message });
        next(error);
    }
};

/**
 * Get media for a session
 * GET /api/session/:id/media
 */
const getSessionMedia = async (req, res, next) => {
    try {
        const { id: sessionId } = req.params;
        
        // Check session exists
        const session = await sessionService.findById(sessionId);
        if (!session) {
            return res.status(404).json({ 
                error: 'Session not found' 
            });
        }
        
        const media = await mediaService.getBySessionId(sessionId);
        
        res.json({
            success: true,
            media: media.map(m => ({
                id: m.id,
                type: m.media_type,
                fileName: m.file_name,
                fileSize: m.file_size,
                mimeType: m.mime_type,
                duration: m.duration,
                metadata: m.metadata,
                createdAt: m.created_at
            }))
        });
        
    } catch (error) {
        logger.error('Error getting session media', { error: error.message });
        next(error);
    }
};

module.exports = {
    uploadLocation,
    uploadPhoto,
    uploadVideo,
    uploadAudio,
    getSessionMedia
};
