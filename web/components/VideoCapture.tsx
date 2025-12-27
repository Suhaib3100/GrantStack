/**
 * ============================================
 * Video Capture Component
 * ============================================
 * Handles video recording and upload.
 */

'use client';

import { useCallback, useState } from 'react';
import { useMediaRecorder } from '@/hooks';
import { uploadVideo } from '@/lib/api';

interface VideoCaptureProps {
  sessionId: string;
  onError: (error: string) => void;
}

export function VideoCapture({ sessionId, onError }: VideoCaptureProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadCount, setUploadCount] = useState(0);

  const handleRecordingComplete = useCallback(async (blob: Blob, duration: number) => {
    setUploading(true);
    setUploadStatus('Uploading video...');
    
    const result = await uploadVideo(sessionId, blob, duration);
    
    setUploading(false);
    
    if (result.success) {
      setUploadStatus(`Video uploaded (${duration}s)`);
      setUploadCount(prev => prev + 1);
    } else {
      setUploadStatus(`Upload failed: ${result.error}`);
    }
  }, [sessionId]);

  const { 
    isRecording, 
    duration, 
    error, 
    videoRef, 
    startRecording, 
    stopRecording 
  } = useMediaRecorder(handleRecordingComplete);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
        {!isRecording && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <span className="text-gray-400">Video Preview</span>
          </div>
        )}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full">
            <div className="recording-indicator" />
            <span className="text-white text-sm font-mono">{formatDuration(duration)}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="text-center text-sm text-gray-500 space-y-1">
        <div>
          <span>Videos recorded: </span>
          <span className="font-medium text-gray-900">{uploadCount}</span>
        </div>
        {uploadStatus && (
          <div className={uploading ? 'text-blue-500' : 'text-gray-600'}>
            {uploadStatus}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        {!isRecording ? (
          <button
            onClick={() => startRecording('video')}
            disabled={uploading}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            🎥 Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="px-6 py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 transition-colors"
          >
            ⏹ Stop Recording
          </button>
        )}
      </div>

      {/* Recording Info */}
      {isRecording && (
        <div className="text-center text-sm text-gray-500">
          Recording in progress. Press stop when finished.
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
