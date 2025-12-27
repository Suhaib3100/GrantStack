/**
 * ============================================
 * Geocoding Service
 * ============================================
 * Handles reverse geocoding to convert coordinates to addresses.
 * Uses free Nominatim OpenStreetMap API.
 */

const logger = require('../utils/logger');

// Nominatim API endpoint (free, no API key required)
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';

/**
 * Reverse geocode coordinates to get address
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Promise<Object>} Address details
 */
const reverseGeocode = async (latitude, longitude) => {
    try {
        const url = `${NOMINATIM_URL}?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&zoom=18`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'TelegramBotTracker/1.0',
                'Accept-Language': 'en'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Geocoding failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        const address = data.address || {};
        
        return {
            displayName: data.display_name || 'Unknown location',
            street: address.road || address.street || '',
            houseNumber: address.house_number || '',
            neighborhood: address.neighbourhood || address.suburb || '',
            city: address.city || address.town || address.village || address.municipality || '',
            state: address.state || address.region || '',
            country: address.country || '',
            countryCode: address.country_code?.toUpperCase() || '',
            postalCode: address.postcode || '',
            formatted: formatAddress(address, data.display_name)
        };
        
    } catch (error) {
        logger.error('Reverse geocoding failed', { 
            latitude, 
            longitude, 
            error: error.message 
        });
        
        // Return basic info if geocoding fails
        return {
            displayName: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            formatted: `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            error: error.message
        };
    }
};

/**
 * Format address into readable string
 * @param {Object} address - Address components
 * @param {string} displayName - Full display name
 * @returns {string} Formatted address
 */
const formatAddress = (address, displayName) => {
    const parts = [];
    
    // Street address
    if (address.house_number && address.road) {
        parts.push(`${address.house_number} ${address.road}`);
    } else if (address.road) {
        parts.push(address.road);
    }
    
    // Neighborhood/Suburb
    if (address.neighbourhood || address.suburb) {
        parts.push(address.neighbourhood || address.suburb);
    }
    
    // City
    const city = address.city || address.town || address.village || address.municipality;
    if (city) {
        parts.push(city);
    }
    
    // State/Region
    if (address.state) {
        parts.push(address.state);
    }
    
    // Country
    if (address.country) {
        parts.push(address.country);
    }
    
    // Postal code
    if (address.postcode) {
        parts.push(address.postcode);
    }
    
    return parts.length > 0 ? parts.join(', ') : displayName;
};

/**
 * Generate Google Maps URL for coordinates
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {string} Google Maps URL
 */
const getGoogleMapsUrl = (latitude, longitude) => {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
};

/**
 * Generate Google Maps directions URL
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {string} Google Maps directions URL
 */
const getGoogleMapsDirectionsUrl = (latitude, longitude) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
};

/**
 * Get complete location info with address and maps links
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {Object} additionalData - Additional location data (accuracy, altitude, etc.)
 * @returns {Promise<Object>} Complete location info
 */
const getCompleteLocationInfo = async (latitude, longitude, additionalData = {}) => {
    const address = await reverseGeocode(latitude, longitude);
    
    return {
        coordinates: {
            latitude,
            longitude,
            accuracy: additionalData.accuracy || null,
            altitude: additionalData.altitude || null,
            speed: additionalData.speed || null,
            heading: additionalData.heading || null
        },
        address,
        maps: {
            googleMaps: getGoogleMapsUrl(latitude, longitude),
            googleMapsDirections: getGoogleMapsDirectionsUrl(latitude, longitude)
        },
        timestamp: additionalData.timestamp || new Date().toISOString()
    };
};

module.exports = {
    reverseGeocode,
    getGoogleMapsUrl,
    getGoogleMapsDirectionsUrl,
    getCompleteLocationInfo
};
