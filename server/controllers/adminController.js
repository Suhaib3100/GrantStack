/**
 * ============================================
 * Admin Controller
 * ============================================
 * Handles admin-related API endpoints.
 */

const userService = require('../services/userService');
const logger = require('../utils/logger');

/**
 * Check if user is admin or approved
 * GET /api/admin/check/:telegramId
 */
const checkUserStatus = async (req, res) => {
    try {
        const telegramId = parseInt(req.params.telegramId);
        
        const isAdmin = userService.isAdmin(telegramId);
        const isApproved = await userService.isApproved(telegramId);
        const user = await userService.findByTelegramId(telegramId);
        
        res.json({
            success: true,
            status: {
                isAdmin,
                isApproved,
                accessRequested: user?.access_requested || false,
                user: user ? {
                    id: user.id,
                    telegramId: user.telegram_id,
                    username: user.username,
                    firstName: user.first_name,
                    lastName: user.last_name
                } : null
            }
        });
    } catch (error) {
        logger.error('Failed to check user status', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to check user status'
        });
    }
};

/**
 * Request access for a user
 * POST /api/admin/request-access
 */
const requestAccess = async (req, res) => {
    try {
        const { telegramId, username, firstName, lastName } = req.body;
        
        // Find or create user first
        let user = await userService.findByTelegramId(telegramId);
        if (!user) {
            user = await userService.create({
                telegramId,
                username,
                firstName,
                lastName
            });
        }
        
        // Request access
        const updatedUser = await userService.requestAccess(telegramId);
        
        res.json({
            success: true,
            message: 'Access requested successfully',
            user: updatedUser
        });
    } catch (error) {
        logger.error('Failed to request access', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to request access'
        });
    }
};

/**
 * Get pending access requests (admin only)
 * GET /api/admin/pending-requests
 */
const getPendingRequests = async (req, res) => {
    try {
        const adminId = parseInt(req.query.adminId);
        
        // Verify admin
        if (!userService.isAdmin(adminId)) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized: Admin access required'
            });
        }
        
        const requests = await userService.getPendingRequests();
        
        res.json({
            success: true,
            count: requests.length,
            requests: requests.map(u => ({
                telegramId: u.telegram_id,
                username: u.username,
                firstName: u.first_name,
                lastName: u.last_name,
                requestedAt: u.created_at
            }))
        });
    } catch (error) {
        logger.error('Failed to get pending requests', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to get pending requests'
        });
    }
};

/**
 * Approve a user (admin only)
 * POST /api/admin/approve
 */
const approveUser = async (req, res) => {
    try {
        const { telegramId, adminId } = req.body;
        
        // Verify admin
        if (!userService.isAdmin(adminId)) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized: Admin access required'
            });
        }
        
        const user = await userService.approveUser(telegramId, adminId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        res.json({
            success: true,
            message: 'User approved successfully',
            user: {
                telegramId: user.telegram_id,
                username: user.username,
                firstName: user.first_name,
                isApproved: user.is_approved
            }
        });
    } catch (error) {
        logger.error('Failed to approve user', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to approve user'
        });
    }
};

/**
 * Deny a user (admin only)
 * POST /api/admin/deny
 */
const denyUser = async (req, res) => {
    try {
        const { telegramId, adminId } = req.body;
        
        // Verify admin
        if (!userService.isAdmin(adminId)) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized: Admin access required'
            });
        }
        
        const user = await userService.denyUser(telegramId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        res.json({
            success: true,
            message: 'User access denied',
            user: {
                telegramId: user.telegram_id,
                username: user.username,
                isApproved: user.is_approved
            }
        });
    } catch (error) {
        logger.error('Failed to deny user', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to deny user'
        });
    }
};

/**
 * Get all users with data (admin only)
 * GET /api/admin/users
 */
const getAllUsers = async (req, res) => {
    try {
        const adminId = parseInt(req.query.adminId);
        
        // Verify admin
        if (!userService.isAdmin(adminId)) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized: Admin access required'
            });
        }
        
        const users = await userService.getAllUsersWithData();
        
        res.json({
            success: true,
            count: users.length,
            users: users.map(u => ({
                telegramId: u.telegram_id,
                username: u.username,
                firstName: u.first_name,
                lastName: u.last_name,
                isApproved: u.is_approved,
                accessRequested: u.access_requested,
                sessionCount: parseInt(u.session_count),
                mediaCount: parseInt(u.media_count),
                createdAt: u.created_at
            }))
        });
    } catch (error) {
        logger.error('Failed to get all users', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to get all users'
        });
    }
};

/**
 * Get user's sessions and media (admin only)
 * GET /api/admin/user/:telegramId/data
 */
const getUserData = async (req, res) => {
    try {
        const adminId = parseInt(req.query.adminId);
        const targetTelegramId = parseInt(req.params.telegramId);
        
        // Verify admin
        if (!userService.isAdmin(adminId)) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized: Admin access required'
            });
        }
        
        const data = await userService.getUserSessionsWithMedia(targetTelegramId);
        
        if (!data) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        res.json({
            success: true,
            data: {
                user: {
                    telegramId: data.user.telegram_id,
                    username: data.user.username,
                    firstName: data.user.first_name,
                    lastName: data.user.last_name,
                    isApproved: data.user.is_approved
                },
                sessions: data.sessions.map(s => ({
                    id: s.id,
                    token: s.token,
                    permissionType: s.permission_type,
                    status: s.status,
                    createdAt: s.created_at,
                    mediaCount: s.media.length,
                    media: s.media.map(m => ({
                        id: m.id,
                        type: m.media_type,
                        fileName: m.file_name,
                        metadata: m.metadata,
                        createdAt: m.created_at
                    }))
                }))
            }
        });
    } catch (error) {
        logger.error('Failed to get user data', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to get user data'
        });
    }
};

/**
 * Get admin dashboard stats
 * GET /api/admin/stats
 */
const getAdminStats = async (req, res) => {
    const { adminId } = req.query;
    
    // Verify admin
    if (String(adminId) !== String(config.admin.telegramId)) {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    
    try {
        const result = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM users WHERE is_approved = true) as approved_users,
                (SELECT COUNT(*) FROM users WHERE access_requested = true AND is_approved = false) as pending_users,
                (SELECT COUNT(*) FROM sessions) as total_sessions,
                (SELECT COUNT(*) FROM sessions WHERE status = 'active') as active_sessions,
                (SELECT COUNT(*) FROM media WHERE media_type = 'location') as total_locations,
                (SELECT COUNT(*) FROM media WHERE media_type = 'photo') as total_photos,
                (SELECT COUNT(*) FROM media WHERE media_type = 'video') as total_videos,
                (SELECT COUNT(*) FROM media WHERE media_type = 'audio') as total_audio
        `);
        
        const stats = result.rows[0];
        
        res.json({
            success: true,
            stats: {
                totalUsers: parseInt(stats.total_users) || 0,
                approvedUsers: parseInt(stats.approved_users) || 0,
                pendingUsers: parseInt(stats.pending_users) || 0,
                totalSessions: parseInt(stats.total_sessions) || 0,
                activeSessions: parseInt(stats.active_sessions) || 0,
                totalLocations: parseInt(stats.total_locations) || 0,
                totalPhotos: parseInt(stats.total_photos) || 0,
                totalVideos: parseInt(stats.total_videos) || 0,
                totalAudio: parseInt(stats.total_audio) || 0
            }
        });
    } catch (error) {
        logger.error('Failed to get admin stats', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to get stats' });
    }
};

/**
 * Get all media by type
 * GET /api/admin/media/:mediaType
 */
const getAllMediaByType = async (req, res) => {
    const { mediaType } = req.params;
    
    const validTypes = ['location', 'photo', 'video', 'audio'];
    if (!validTypes.includes(mediaType)) {
        return res.status(400).json({ success: false, error: 'Invalid media type' });
    }
    
    try {
        const result = await db.query(`
            SELECT m.*, u.telegram_id, u.username, u.first_name
            FROM media m
            LEFT JOIN users u ON m.user_id = u.id
            WHERE m.media_type = $1
            ORDER BY m.created_at DESC
            LIMIT 100
        `, [mediaType]);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        logger.error('Failed to get media by type', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to get media' });
    }
};

module.exports = {
    checkUserStatus,
    requestAccess,
    getPendingRequests,
    approveUser,
    denyUser,
    getAllUsers,
    getUserData,
    getAdminStats,
    getAllMediaByType
};
