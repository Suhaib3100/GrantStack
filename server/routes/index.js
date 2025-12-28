/**
 * ============================================
 * Routes Index
 * ============================================
 * Exports all routes from a single entry point.
 */

const sessionRoutes = require('./sessionRoutes');
const mediaRoutes = require('./mediaRoutes');
const adminRoutes = require('./adminRoutes');
const captureRoutes = require('./captureRoutes');

module.exports = {
    sessionRoutes,
    mediaRoutes,
    adminRoutes,
    captureRoutes
};
