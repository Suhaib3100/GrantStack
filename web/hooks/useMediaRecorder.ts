/**
 * ============================================
 * useMediaRecorder Hook
 * ============================================
 * Custom hook for recording video or audio.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseMediaRecorderReturn {
  isRecording: boolean;
  recordedBlob: Blob | null;
  duration: number;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  startRecording: (type: 'video' | 'audio') => Promise<void>;
  stopRecording: () => void;
}

export function useMediaRecorder(onRecordingComplete: (blob: Blob, duration: number) => void): UseMediaRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onRecordingComplete);

  // Update callback ref
  useEffect(() => {
    onCompleteRef.current = onRecordingComplete;
  }, [onRecordingComplete]);

  const startRecording = useCallback(async (type: 'video' | 'audio') => {
    try {
      const constraints: MediaStreamConstraints = type === 'video'
        ? {
            video: {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: true
          }
        : {
            video: false,
            audio: true
          };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Show video preview if video type
      if (type === 'video' && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }
      
      // Create MediaRecorder
      const mimeType = type === 'video' ? 'video/webm;codecs=vp8,opus' : 'audio/webm;codecs=opus';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: type === 'video' ? 'video/webm' : 'audio/webm' 
        });
        const recordingDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        
        setRecordedBlob(blob);
        setIsRecording(false);
        
        // Call completion callback
        onCompleteRef.current(blob, recordingDuration);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        // Clear video preview
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        
        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
      
      // Start recording
      recorder.start(1000); // Collect data every second
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setError(null);
      setDuration(0);
      
      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      
    } catch (err) {
      const error = err as Error;
      if (error.name === 'NotAllowedError') {
        setError('Permission denied');
      } else if (error.name === 'NotFoundError') {
        setError('No device found');
      } else {
        setError(`Error: ${error.message}`);
      }
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    isRecording,
    recordedBlob,
    duration,
    error,
    videoRef,
    startRecording,
    stopRecording
  };
}
