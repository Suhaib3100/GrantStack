/**
 * ============================================
 * useCamera Hook
 * ============================================
 * Custom hook for handling camera capture.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseCameraReturn {
  isActive: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  error: string | null;
  photoCount: number;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => Promise<Blob | null>;
}

export function useCamera(): UseCameraReturn {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setIsActive(true);
      setError(null);
    } catch (err) {
      const error = err as Error;
      if (error.name === 'NotAllowedError') {
        setError('Camera permission denied');
      } else if (error.name === 'NotFoundError') {
        setError('No camera found on this device');
      } else {
        setError(`Camera error: ${error.message}`);
      }
      setIsActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsActive(false);
  }, []);

  const capturePhoto = useCallback(async (): Promise<Blob | null> => {
    if (!videoRef.current || !isActive) {
      return null;
    }
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }
    
    ctx.drawImage(video, 0, 0);
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          setPhotoCount(prev => prev + 1);
        }
        resolve(blob);
      }, 'image/jpeg', 0.8);
    });
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    isActive,
    videoRef,
    error,
    photoCount,
    startCamera,
    stopCamera,
    capturePhoto
  };
}
