/**
 * ============================================
 * Audio Capture Component
 * ============================================
 * Handles microphone recording and upload.
 */

'use client';

import { useCallback, useState } from 'react';
import { useMediaRecorder } from '@/hooks';
import { uploadAudio } from '@/lib/api';

interface AudioCaptureProps {
  sessionId: string;
  onError: (error: string) => void;
}

export function AudioCapture({ sessionId, onError }: AudioCaptureProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadCount, setUploadCount] = useState(0);

  const handleRecordingComplete = useCallback(async (blob: Blob, duration: number) => {
    setUploading(true);
    setUploadStatus('Uploading audio...');
    
    const result = await uploadAudio(sessionId, blob, duration);
    
    setUploading(false);
    
    if (result.success) {
      setUploadStatus(`Audio uploaded (${duration}s)`);
      setUploadCount(prev => prev + 1);
    } else {
      setUploadStatus(`Upload failed: ${result.error}`);
    }
  }, [sessionId]);

  const { 
    isRecording, 
    duration, 
    error, 
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
      {/* Audio Visualizer Placeholder */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden h-48 flex items-center justify-center">
        {isRecording ? (
          <div className="flex items-center gap-4">
            <div className="recording-indicator w-4 h-4" />
            <div className="flex gap-1">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 bg-green-500 rounded-full animate-pulse"
                  style={{
                    height: `${20 + Math.random() * 60}px`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
            <span className="text-white font-mono text-2xl">{formatDuration(duration)}</span>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-6xl mb-2">🎤</div>
            <span className="text-gray-400">Microphone Ready</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="text-center text-sm text-gray-500 space-y-1">
        <div>
          <span>Recordings uploaded: </span>
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
            onClick={() => startRecording('audio')}
            disabled={uploading}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            🎙 Start Recording
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
