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

// ============================================
// Staff Management Routes
// ============================================

// Get user role
router.get('/role/:telegramId', adminController.getUserRole);

// Get all staff members (admin only)
router.get('/staff', adminController.getStaffList);

// Add staff member (admin only)
router.post('/staff/add', adminController.addStaff);

// Update staff role (admin only)
router.post('/staff/role', adminController.updateStaffRole);

// Remove staff member (admin only)
router.delete('/staff/:telegramId', adminController.removeStaff);

module.exports = router;
