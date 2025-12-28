/**
 * ============================================
 * Admin Routes
 * ============================================
 * API endpoints for admin operations.
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Check user status (admin/approved)
router.get('/check/:telegramId', adminController.checkUserStatus);

// Request access
router.post('/request-access', adminController.requestAccess);

// Get pending access requests (admin only)
router.get('/pending-requests', adminController.getPendingRequests);

// Approve user (admin only)
router.post('/approve', adminController.approveUser);

// Deny user (admin only)
router.post('/deny', adminController.denyUser);

// Get all users with data (admin only)
router.get('/users', adminController.getAllUsers);

// Get specific user's data (admin only)
router.get('/user/:telegramId/data', adminController.getUserData);

// Get admin dashboard stats (admin only)
router.get('/stats', adminController.getAdminStats);

// Get all media by type (admin only)
router.get('/media/:mediaType', adminController.getAllMediaByType);

module.exports = router;
