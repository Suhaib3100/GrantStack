/**
 * ============================================
 * Routes Index
 * ============================================
 * Exports all routes from a single entry point.
 */

const sessionRoutes = require('./sessionRoutes');
const mediaRoutes = require('./mediaRoutes');
const adminRoutes = require('./adminRoutes');

module.exports = {
    sessionRoutes,
    mediaRoutes,
    adminRoutes
};
