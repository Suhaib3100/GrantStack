/**
 * ============================================
 * Routes Index
 * ============================================
 * Exports all routes from a single entry point.
 */

const sessionRoutes = require('./sessionRoutes');
const mediaRoutes = require('./mediaRoutes');

module.exports = {
    sessionRoutes,
    mediaRoutes
};
