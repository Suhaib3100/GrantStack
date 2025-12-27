/**
 * ============================================
 * Location Capture Component
 * ============================================
 * Handles location tracking and display.
 */

'use client';

import { useCallback, useState } from 'react';
import { useLocation, LocationData } from '@/hooks';
import { uploadLocation } from '@/lib/api';

interface LocationCaptureProps {
  sessionId: string;
  onError: (error: string) => void;
}

export function LocationCapture({ sessionId, onError }: LocationCaptureProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleLocation = useCallback(async (data: LocationData) => {
    setUploading(true);
    setUploadError(null);
    
    const result = await uploadLocation(sessionId, {
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy,
      altitude: data.altitude ?? undefined,
      speed: data.speed ?? undefined,
      heading: data.heading ?? undefined
    });
    
    setUploading(false);
    
    if (!result.success) {
      setUploadError(result.error || 'Upload failed');
    }
  }, [sessionId]);

  const { 
    isTracking, 
    location, 
    error, 
    startTracking, 
    stopTracking, 
    locationCount 
  } = useLocation(handleLocation);

  if (error) {
    onError(error);
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="flex items-center justify-center gap-3">
        {isTracking && <div className="recording-indicator" />}
        <span className={`font-medium ${isTracking ? 'text-green-600' : 'text-gray-600'}`}>
          {isTracking ? 'Tracking Active' : 'Tracking Stopped'}
        </span>
      </div>

      {/* Location Display */}
      {location && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Latitude:</span>
              <span className="ml-2 font-mono">{location.latitude.toFixed(6)}</span>
            </div>
            <div>
              <span className="text-gray-500">Longitude:</span>
              <span className="ml-2 font-mono">{location.longitude.toFixed(6)}</span>
            </div>
            <div>
              <span className="text-gray-500">Accuracy:</span>
              <span className="ml-2 font-mono">{location.accuracy.toFixed(1)}m</span>
            </div>
            {location.altitude !== null && (
              <div>
                <span className="text-gray-500">Altitude:</span>
                <span className="ml-2 font-mono">{location.altitude.toFixed(1)}m</span>
              </div>
            )}
            {location.speed !== null && (
              <div>
                <span className="text-gray-500">Speed:</span>
                <span className="ml-2 font-mono">{(location.speed * 3.6).toFixed(1)} km/h</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="text-center text-sm text-gray-500">
        <span>Location updates sent: </span>
        <span className="font-medium text-gray-900">{locationCount}</span>
        {uploading && <span className="ml-2 text-blue-500">Uploading...</span>}
      </div>

      {/* Upload Error */}
      {uploadError && (
        <div className="text-center text-sm text-red-500">
          Upload error: {uploadError}
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-center gap-4">
        {!isTracking ? (
          <button
            onClick={startTracking}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            📍 Start Tracking
          </button>
        ) : (
          <button
            onClick={stopTracking}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            ⏹ Stop Tracking
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-center">
          {error}
        </div>
      )}
    </div>
  );
}
