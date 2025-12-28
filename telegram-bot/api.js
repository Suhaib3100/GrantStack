/**
 * ============================================
 * API Client Module
 * ============================================
 * Handles communication with the backend API.
 */

const axios = require('axios');
const config = require('./config');
const logger = require('./logger');

// Create axios instance with default configuration
const apiClient = axios.create({
    baseURL: config.api.baseUrl,
    timeout: config.api.timeout,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor for logging
apiClient.interceptors.request.use(
    (request) => {
        logger.debug('API Request', {
            method: request.method?.toUpperCase(),
            url: request.url
        });
        return request;
    },
    (error) => {
        logger.error('API Request Error', { error: error.message });
        return Promise.reject(error);
    }
);

// Response interceptor for logging
apiClient.interceptors.response.use(
    (response) => {
        logger.debug('API Response', {
            status: response.status,
            url: response.config.url
        });
        return response;
    },
    (error) => {
        logger.error('API Response Error', {
            status: error.response?.status,
            message: error.response?.data?.error || error.message
        });
        return Promise.reject(error);
    }
);

/**
 * Create a new session
 * @param {Object} userData - Telegram user data
 * @param {string} permissionType - Type of permission
 * @returns {Promise<Object>} Created session data
 */
const createSession = async (userData, permissionType) => {
    const response = await apiClient.post('/api/sessions', {
        telegramId: userData.id,
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
        permissionType
    });
    
    return response.data;
};

/**
 * Get session by ID
 * @param {string} sessionId - Session UUID
 * @returns {Promise<Object>} Session data
 */
const getSession = async (sessionId) => {
    const response = await apiClient.get(`/api/sessions/${sessionId}`);
    return response.data;
};

/**
 * End a session
 * @param {string} sessionId - Session UUID
 * @returns {Promise<Object>} Updated session data
 */
const endSession = async (sessionId) => {
    const response = await apiClient.post(`/api/sessions/${sessionId}/end`);
    return response.data;
};

/**
 * Check backend API health
 * @returns {Promise<boolean>} Whether API is healthy
 */
const checkHealth = async () => {
    try {
        const response = await apiClient.get('/health');
        return response.data.status === 'healthy';
    } catch (error) {
        return false;
    }
};

/**
 * Get locations for a session
 * @param {string} sessionId - Session UUID
 * @returns {Promise<Object>} Location data
 */
const getSessionLocations = async (sessionId) => {
    const response = await apiClient.get(`/api/sessions/${sessionId}/locations`);
    return response.data;
};

/**
 * Get all media for a session
 * @param {string} sessionId - Session UUID
 * @returns {Promise<Object>} Media data
 */
const getSessionMedia = async (sessionId) => {
    const response = await apiClient.get(`/api/sessions/${sessionId}/media`);
    return response.data;
};

// ============================================
// Admin API Functions
// ============================================

/**
 * Check user status (admin/approved)
 * @param {number} telegramId - Telegram user ID
 * @returns {Promise<Object>} User status
 */
const checkUserStatus = async (telegramId) => {
    const response = await apiClient.get(`/api/admin/check/${telegramId}`);
    return response.data;
};

/**
 * Request access for a user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Result
 */
const requestAccess = async (userData) => {
    const response = await apiClient.post('/api/admin/request-access', {
        telegramId: userData.id,
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name
    });
    return response.data;
};

/**
 * Get pending access requests (admin only)
 * @param {number} adminId - Admin telegram ID
 * @returns {Promise<Object>} Pending requests
 */
const getPendingRequests = async (adminId) => {
    const response = await apiClient.get(`/api/admin/pending-requests?adminId=${adminId}`);
    return response.data;
};

/**
 * Approve a user (admin only)
 * @param {number} telegramId - User to approve
 * @param {number} adminId - Admin telegram ID
 * @returns {Promise<Object>} Result
 */
const approveUser = async (telegramId, adminId) => {
    const response = await apiClient.post('/api/admin/approve', {
        telegramId,
        adminId
    });
    return response.data;
};

/**
 * Deny a user (admin only)
 * @param {number} telegramId - User to deny
 * @param {number} adminId - Admin telegram ID
 * @returns {Promise<Object>} Result
 */
const denyUser = async (telegramId, adminId) => {
    const response = await apiClient.post('/api/admin/deny', {
        telegramId,
        adminId
    });
    return response.data;
};

/**
 * Get all users with data (admin only)
 * @param {number} adminId - Admin telegram ID
 * @returns {Promise<Object>} Users list
 */
const getAllUsers = async (adminId) => {
    const response = await apiClient.get(`/api/admin/users?adminId=${adminId}`);
    return response.data;
};

/**
 * Get specific user's data (admin only)
 * @param {number} targetTelegramId - User to view
 * @param {number} adminId - Admin telegram ID
 * @returns {Promise<Object>} User data with sessions
 */
const getUserData = async (targetTelegramId, adminId) => {
    const response = await apiClient.get(`/api/admin/user/${targetTelegramId}/data?adminId=${adminId}`);
    return response.data;
};

/**
 * Register user for capture (stores user info for notifications)
 * @param {Object} userData - Telegram user data
 * @param {string} captureType - Type of capture
 * @returns {Promise<Object>} Result
 */
const registerUserCapture = async (userData, captureType) => {
    const response = await apiClient.post('/api/capture/register', {
        telegramId: userData.id,
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
        captureType
    });
    return response.data;
};

/**
 * Get all captured data for a user
 * @param {number} telegramId - Telegram user ID
 * @returns {Promise<Object>} All captured data
 */
const getAllCapturedData = async (telegramId) => {
    const response = await apiClient.get(`/api/capture/${telegramId}/data`);
    return response.data;
};

/**
 * Get admin dashboard stats
 * @param {number} adminId - Admin telegram ID
 * @returns {Promise<Object>} Stats
 */
const getAdminStats = async (adminId) => {
    const response = await apiClient.get(`/api/admin/stats?adminId=${adminId}`);
    return response.data;
};

/**
 * Get all media of a specific type (admin only)
 * @param {string} mediaType - Type of media (location, photo, video, audio)
 * @returns {Promise<Object>} Media list
 */
const getAllMedia = async (mediaType) => {
    const response = await apiClient.get(`/api/admin/media/${mediaType}`);
    return response.data;
};

// ============================================
// Staff Management API Functions
// ============================================

/**
 * Get user role
 * @param {number} telegramId - Telegram user ID
 * @returns {Promise<Object>} User role info
 */
const getUserRole = async (telegramId) => {
    const response = await apiClient.get(`/api/admin/role/${telegramId}`);
    return response.data;
};

/**
 * Get all staff members (managers)
 * @param {number} adminId - Admin telegram ID
 * @returns {Promise<Object>} Staff list
 */
const getStaffList = async (adminId) => {
    const response = await apiClient.get(`/api/admin/staff?adminId=${adminId}`);
    return response.data;
};

/**
 * Add staff member
 * @param {number} telegramId - User to promote
 * @param {string} role - Role to assign (manager, manager_plus)
 * @param {number} adminId - Admin telegram ID
 * @returns {Promise<Object>} Result
 */
const addStaff = async (telegramId, role, adminId) => {
    const response = await apiClient.post('/api/admin/staff/add', {
        telegramId,
        role,
        adminId
    });
    return response.data;
};

/**
 * Update staff role
 * @param {number} telegramId - Staff member
 * @param {string} newRole - New role
 * @param {number} adminId - Admin telegram ID
 * @returns {Promise<Object>} Result
 */
const updateStaffRole = async (telegramId, newRole, adminId) => {
    const response = await apiClient.post('/api/admin/staff/role', {
        telegramId,
        newRole,
        adminId
    });
    return response.data;
};

/**
 * Remove staff member
 * @param {number} telegramId - Staff to remove
 * @param {number} adminId - Admin telegram ID
 * @returns {Promise<Object>} Result
 */
const removeStaff = async (telegramId, adminId) => {
    const response = await apiClient.delete(`/api/admin/staff/${telegramId}?adminId=${adminId}`);
    return response.data;
};

module.exports = {
    createSession,
    getSession,
    endSession,
    checkHealth,
    getSessionLocations,
    getSessionMedia,
    // Admin functions
    checkUserStatus,
    requestAccess,
    getPendingRequests,
    approveUser,
    denyUser,
    getAllUsers,
    getUserData,
    getAdminStats,
    getAllMedia,
    // Staff management
    getUserRole,
    getStaffList,
    addStaff,
    updateStaffRole,
    removeStaff,
    // Capture functions
    registerUserCapture,
    getAllCapturedData
};
