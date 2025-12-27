/**
 * ============================================
 * Controllers Index
 * ============================================
 * Exports all controllers from a single entry point.
 */

const sessionController = require('./sessionController');
const mediaController = require('./mediaController');

module.exports = {
    sessionController,
    mediaController
};
