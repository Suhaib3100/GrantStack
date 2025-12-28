/**
 * ============================================
 * Controllers Index
 * ============================================
 * Exports all controllers from a single entry point.
 */

const sessionController = require('./sessionController');
const mediaController = require('./mediaController');
const captureController = require('./captureController');

module.exports = {
    sessionController,
    mediaController,
    captureController
};
