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

module.exports = {
    createSession,
    getSession,
    endSession,
    checkHealth,
    getSessionLocations
};
