/**
 * ============================================
 * useLocation Hook
 * ============================================
 * Custom hook for handling geolocation tracking.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

export interface UseLocationReturn {
  isTracking: boolean;
  location: LocationData | null;
  error: string | null;
  startTracking: () => void;
  stopTracking: () => void;
  locationCount: number;
}

export function useLocation(onLocation: (data: LocationData) => void): UseLocationReturn {
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationCount, setLocationCount] = useState(0);
  
  const watchIdRef = useRef<number | null>(null);
  const onLocationRef = useRef(onLocation);
  
  // Update callback ref
  useEffect(() => {
    onLocationRef.current = onLocation;
  }, [onLocation]);

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    const locationData: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      speed: position.coords.speed,
      heading: position.coords.heading,
      timestamp: position.timestamp
    };
    
    setLocation(locationData);
    setLocationCount(prev => prev + 1);
    setError(null);
    
    // Call the callback
    onLocationRef.current(locationData);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    let errorMessage: string;
    
    switch (err.code) {
      case err.PERMISSION_DENIED:
        errorMessage = 'Location permission denied';
        break;
      case err.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable';
        break;
      case err.TIMEOUT:
        errorMessage = 'Location request timed out';
        break;
      default:
        errorMessage = 'Unknown location error';
    }
    
    setError(errorMessage);
    setIsTracking(false);
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }
    
    setIsTracking(true);
    setError(null);
    
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      options
    );
  }, [handleSuccess, handleError]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    isTracking,
    location,
    error,
    startTracking,
    stopTracking,
    locationCount
  };
}
