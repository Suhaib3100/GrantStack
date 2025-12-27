/**
 * ============================================
 * Photo Capture Component
 * ============================================
 * Handles single and continuous photo capture.
 */

'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { useCamera } from '@/hooks';
import { uploadPhoto } from '@/lib/api';

interface PhotoCaptureProps {
  sessionId: string;
  continuous: boolean;
  onError: (error: string) => void;
}

// Continuous capture interval in milliseconds
const CAPTURE_INTERVAL_MS = 5000;

export function PhotoCapture({ sessionId, continuous, onError }: PhotoCaptureProps) {
  const [uploading, setUploading] = useState(false);
  const [lastUpload, setLastUpload] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { 
    isActive, 
    videoRef, 
    error, 
    photoCount, 
    startCamera, 
    stopCamera, 
    capturePhoto 
  } = useCamera();

  const handleCapture = useCallback(async () => {
    const blob = await capturePhoto();
    
    if (!blob) {
      return;
    }
    
    setUploading(true);
    setUploadError(null);
    
    const result = await uploadPhoto(sessionId, blob);
    
    setUploading(false);
    setLastUpload(new Date().toLocaleTimeString());
    
    if (!result.success) {
      setUploadError(result.error || 'Upload failed');
    }
  }, [capturePhoto, sessionId]);

  const startContinuousCapture = useCallback(() => {
    setIsCapturing(true);
    
    // Capture immediately
    handleCapture();
    
    // Then capture at intervals
    intervalRef.current = setInterval(() => {
      handleCapture();
    }, CAPTURE_INTERVAL_MS);
  }, [handleCapture]);

  const stopContinuousCapture = useCallback(() => {
    setIsCapturing(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  if (error) {
    onError(error);
  }

  return (
    <div className="space-y-6">
      {/* Video Preview */}
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <span className="text-gray-400">Camera Preview</span>
          </div>
        )}
        {isCapturing && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full">
            <div className="recording-indicator" />
            <span className="text-white text-sm">Capturing</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="text-center text-sm text-gray-500 space-y-1">
        <div>
          <span>Photos captured: </span>
          <span className="font-medium text-gray-900">{photoCount}</span>
        </div>
        {lastUpload && (
          <div>
            <span>Last upload: </span>
            <span className="font-medium text-gray-900">{lastUpload}</span>
          </div>
        )}
        {uploading && <div className="text-blue-500">Uploading...</div>}
      </div>

      {/* Upload Error */}
      {uploadError && (
        <div className="text-center text-sm text-red-500">
          Upload error: {uploadError}
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-center gap-4">
        {!isActive ? (
          <button
            onClick={startCamera}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            📷 Start Camera
          </button>
        ) : (
          <>
            {continuous ? (
              // Continuous capture controls
              !isCapturing ? (
                <button
                  onClick={startContinuousCapture}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  ▶ Start Capture
                </button>
              ) : (
                <button
                  onClick={stopContinuousCapture}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  ⏹ Stop Capture
                </button>
              )
            ) : (
              // Single photo capture
              <button
                onClick={handleCapture}
                disabled={uploading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                📸 Take Photo
              </button>
            )}
            <button
              onClick={() => {
                stopContinuousCapture();
                stopCamera();
              }}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              ⏹ Stop Camera
            </button>
          </>
        )}
      </div>

      {/* Instructions */}
      {continuous && isActive && !isCapturing && (
        <div className="text-center text-sm text-gray-500">
          Photos will be captured every {CAPTURE_INTERVAL_MS / 1000} seconds
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-center">
          {error}
        </div>
      )}
    </div>
  );
}
