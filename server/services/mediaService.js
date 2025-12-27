/**
 * ============================================
 * Media Service
 * ============================================
 * Handles media file storage and metadata management.
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const config = require('../config');
const logger = require('../utils/logger');
const sessionService = require('./sessionService');

/**
 * Ensure storage directories exist
 */
const ensureStorageDirectories = async () => {
    const directories = [
        config.storage.basePath,
        config.storage.photosPath,
        config.storage.videosPath,
        config.storage.audioPath
    ];
    
    for (const dir of directories) {
        try {
            await fs.mkdir(dir, { recursive: true });
            logger.debug('Storage directory ensured', { path: dir });
        } catch (error) {
            logger.error('Failed to create storage directory', { 
                path: dir, 
                error: error.message 
            });
            throw error;
        }
    }
};

/**
 * Get storage path for media type
 * @param {string} mediaType - Type of media
 * @returns {string} Storage path
 */
const getStoragePath = (mediaType) => {
    const pathMap = {
        photo: config.storage.photosPath,
        video: config.storage.videosPath,
        audio: config.storage.audioPath
    };
    return pathMap[mediaType] || config.storage.basePath;
};

/**
 * Validate MIME type for media type
 * @param {string} mediaType - Type of media
 * @param {string} mimeType - MIME type to validate
 * @returns {boolean} Whether MIME type is valid
 */
const validateMimeType = (mediaType, mimeType) => {
    const allowedTypes = config.storage.allowedMimeTypes[mediaType];
    if (!allowedTypes) {
        return false;
    }
    return allowedTypes.includes(mimeType);
};

/**
 * Generate unique filename
 * @param {string} originalName - Original filename
 * @param {string} mediaType - Type of media
 * @returns {string} Unique filename
 */
const generateFilename = (originalName, mediaType) => {
    const ext = path.extname(originalName) || getDefaultExtension(mediaType);
    const timestamp = Date.now();
    const uuid = uuidv4().substring(0, 8);
    return `${mediaType}_${timestamp}_${uuid}${ext}`;
};

/**
 * Get default file extension for media type
 * @param {string} mediaType - Type of media
 * @returns {string} Default extension
 */
const getDefaultExtension = (mediaType) => {
    const extMap = {
        photo: '.jpg',
        video: '.webm',
        audio: '.webm'
    };
    return extMap[mediaType] || '.bin';
};

/**
 * Save media file to disk
 * @param {string} sessionId - Session UUID
 * @param {string} mediaType - Type of media
 * @param {Buffer} fileBuffer - File data
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Saved media metadata
 */
const saveFile = async (sessionId, mediaType, fileBuffer, options = {}) => {
    const {
        originalName = 'upload',
        mimeType = 'application/octet-stream',
        duration = null,
        metadata = {}
    } = options;
    
    // Validate session
    const validation = await sessionService.validate(sessionId);
    if (!validation.valid) {
        throw new Error(validation.error);
    }
    
    // Validate MIME type if strict validation is enabled
    if (mediaType !== 'location' && !validateMimeType(mediaType, mimeType)) {
        logger.warn('Invalid MIME type', { mediaType, mimeType });
        // Allow but log warning - browser implementations vary
    }
    
    // Generate filename and path
    const filename = generateFilename(originalName, mediaType);
    const storagePath = getStoragePath(mediaType);
    const filePath = path.join(storagePath, filename);
    
    // Ensure storage directory exists
    await ensureStorageDirectories();
    
    // Write file to disk
    await fs.writeFile(filePath, fileBuffer);
    
    // Create database record
    const result = await db.query(
        `INSERT INTO media (session_id, media_type, file_path, file_name, file_size, mime_type, duration, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [sessionId, mediaType, filePath, filename, fileBuffer.length, mimeType, duration, JSON.stringify(metadata)]
    );
    
    const media = result.rows[0];
    
    // Create event
    await sessionService.createEvent(sessionId, 'data_received', {
        mediaId: media.id,
        mediaType,
        fileSize: fileBuffer.length
    });
    
    logger.info('Media file saved', {
        mediaId: media.id,
        sessionId,
        mediaType,
        fileSize: fileBuffer.length
    });
    
    return media;
};

/**
 * Save location data
 * @param {string} sessionId - Session UUID
 * @param {Object} locationData - Location coordinates
 * @returns {Promise<Object>} Saved media metadata
 */
const saveLocation = async (sessionId, locationData) => {
    // Validate session
    const validation = await sessionService.validate(sessionId);
    if (!validation.valid) {
        throw new Error(validation.error);
    }
    
    const { latitude, longitude, accuracy, altitude, speed, heading, timestamp } = locationData;
    
    // Create database record
    const result = await db.query(
        `INSERT INTO media (session_id, media_type, metadata)
         VALUES ($1, 'location', $2)
         RETURNING *`,
        [sessionId, JSON.stringify({
            latitude,
            longitude,
            accuracy,
            altitude,
            speed,
            heading,
            timestamp: timestamp || new Date().toISOString()
        })]
    );
    
    const media = result.rows[0];
    
    // Create event
    await sessionService.createEvent(sessionId, 'data_received', {
        mediaId: media.id,
        mediaType: 'location',
        coordinates: { latitude, longitude }
    });
    
    logger.info('Location data saved', {
        mediaId: media.id,
        sessionId,
        latitude,
        longitude
    });
    
    return media;
};

/**
 * Save location data with complete address details
 * @param {string} sessionId - Session UUID
 * @param {Object} locationInfo - Complete location info with address and maps
 * @returns {Promise<Object>} Saved media metadata
 */
const saveLocationWithDetails = async (sessionId, locationInfo) => {
    // Validate session
    const validation = await sessionService.validate(sessionId);
    if (!validation.valid) {
        throw new Error(validation.error);
    }
    
    // Create database record with full location info
    const result = await db.query(
        `INSERT INTO media (session_id, media_type, metadata)
         VALUES ($1, 'location', $2)
         RETURNING *`,
        [sessionId, JSON.stringify(locationInfo)]
    );
    
    const media = result.rows[0];
    
    // Create event
    await sessionService.createEvent(sessionId, 'data_received', {
        mediaId: media.id,
        mediaType: 'location',
        coordinates: locationInfo.coordinates
    });
    
    logger.info('Location data with details saved', {
        mediaId: media.id,
        sessionId,
        address: locationInfo.address?.formatted
    });
    
    return media;
};

/**
 * Get locations for a session
 * @param {string} sessionId - Session UUID
 * @returns {Promise<Array>} Array of location records with parsed metadata
 */
const getLocationsBySession = async (sessionId) => {
    const result = await db.query(
        `SELECT * FROM media 
         WHERE session_id = $1 AND media_type = 'location'
         ORDER BY created_at ASC`,
        [sessionId]
    );
    
    return result.rows.map(row => ({
        id: row.id,
        timestamp: row.created_at,
        data: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
    }));
};

/**
 * Get media by session ID
 * @param {string} sessionId - Session UUID
 * @returns {Promise<Array>} Array of media records
 */
const getBySessionId = async (sessionId) => {
    const result = await db.query(
        `SELECT * FROM media 
         WHERE session_id = $1 
         ORDER BY created_at ASC`,
        [sessionId]
    );
    return result.rows;
};

/**
 * Get media by ID
 * @param {string} id - Media UUID
 * @returns {Promise<Object|null>} Media record or null
 */
const findById = async (id) => {
    const result = await db.query(
        'SELECT * FROM media WHERE id = $1',
        [id]
    );
    return result.rows[0] || null;
};

/**
 * Get media count by session
 * @param {string} sessionId - Session UUID
 * @returns {Promise<Object>} Count by media type
 */
const getCountBySession = async (sessionId) => {
    const result = await db.query(
        `SELECT media_type, COUNT(*) as count
         FROM media 
         WHERE session_id = $1 
         GROUP BY media_type`,
        [sessionId]
    );
    
    const counts = {};
    result.rows.forEach(row => {
        counts[row.media_type] = parseInt(row.count, 10);
    });
    
    return counts;
};

/**
 * Delete media file and record
 * @param {string} id - Media UUID
 * @returns {Promise<boolean>} Success status
 */
const deleteMedia = async (id) => {
    const media = await findById(id);
    
    if (!media) {
        return false;
    }
    
    // Delete file if it exists
    if (media.file_path) {
        try {
            await fs.unlink(media.file_path);
        } catch (error) {
            logger.warn('Failed to delete file', { 
                path: media.file_path, 
                error: error.message 
            });
        }
    }
    
    // Delete database record
    await db.query('DELETE FROM media WHERE id = $1', [id]);
    
    logger.info('Media deleted', { mediaId: id });
    
    return true;
};

module.exports = {
    ensureStorageDirectories,
    validateMimeType,
    saveFile,
    saveLocation,
    saveLocationWithDetails,
    getLocationsBySession,
    getBySessionId,
    findById,
    getCountBySession,
    deleteMedia
};
