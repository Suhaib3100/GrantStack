/**
 * ============================================
 * Session Page
 * ============================================
 * Main page for handling permission sessions.
 * Route: /s/[token]
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { fetchSession, activateSession, SessionData } from '@/lib/api';
import { LocationCapture, PhotoCapture, VideoCapture, AudioCapture } from '@/components';

// Permission type configuration
const PERMISSION_CONFIG = {
  location: {
    title: 'Location Tracking',
    description: 'This session will track your real-time location.',
    icon: '📍',
    warning: 'Your GPS coordinates will be recorded continuously.'
  },
  single_photo: {
    title: 'Photo Capture',
    description: 'This session will capture a photo from your camera.',
    icon: '📷',
    warning: 'A single photo will be taken from your device camera.'
  },
  continuous_photo: {
    title: 'Continuous Photo Capture',
    description: 'This session will capture photos continuously.',
    icon: '📸',
    warning: 'Photos will be captured periodically from your camera.'
  },
  video: {
    title: 'Video Recording',
    description: 'This session will record video from your camera.',
    icon: '🎥',
    warning: 'Video and audio will be recorded from your device.'
  },
  microphone: {
    title: 'Audio Recording',
    description: 'This session will record audio from your microphone.',
    icon: '🎤',
    warning: 'Audio will be recorded from your device microphone.'
  }
};

type PermissionType = keyof typeof PERMISSION_CONFIG;

export default function SessionPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [activating, setActivating] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  // Fetch session data on mount
  useEffect(() => {
    const loadSession = async () => {
      if (!token) {
        setError('No session token provided');
        setLoading(false);
        return;
      }
      
      const result = await fetchSession(token);
      
      if (!result.success) {
        setError(result.error || 'Failed to load session');
      } else if (result.session) {
        setSession(result.session);
        
        // Check if already expired
        if (result.session.isExpired || result.session.status === 'expired') {
          setError('This session has expired');
        } else if (result.session.status === 'ended') {
          setError('This session has ended');
        }
      }
      
      setLoading(false);
    };
    
    loadSession();
  }, [token]);

  // Handle consent and activate session
  const handleConsent = useCallback(async () => {
    if (!session) return;
    
    setActivating(true);
    
    const result = await activateSession(session.id);
    
    if (result.success) {
      setConsentGiven(true);
      setSession(prev => prev ? { ...prev, status: 'active' } : null);
    } else {
      setError(result.error || 'Failed to activate session');
    }
    
    setActivating(false);
  }, [session]);

  // Handle capture errors
  const handleCaptureError = useCallback((error: string) => {
    setCaptureError(error);
  }, []);

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading session...</p>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Go Home
          </a>
        </div>
      </main>
    );
  }

  // No session
  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Not Found</h1>
          <p className="text-gray-600">The requested session could not be found.</p>
        </div>
      </main>
    );
  }

  const permissionConfig = PERMISSION_CONFIG[session.permissionType as PermissionType];

  // Consent screen
  if (!consentGiven && session.status === 'created') {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">{permissionConfig.icon}</div>
            <h1 className="text-2xl font-bold text-gray-900">{permissionConfig.title}</h1>
          </div>

          {/* Description */}
          <div className="mb-6">
            <p className="text-gray-600 text-center mb-4">{permissionConfig.description}</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                ⚠️ {permissionConfig.warning}
              </p>
            </div>
          </div>

          {/* Session Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">Session ID:</span>
              <span className="font-mono text-gray-700">{session.id.substring(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Expires:</span>
              <span className="text-gray-700">{new Date(session.expiresAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Consent Button */}
          <button
            onClick={handleConsent}
            disabled={activating}
            className="w-full py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {activating ? 'Activating...' : 'Grant Permission & Start'}
          </button>

          {/* Decline */}
          <p className="text-center text-sm text-gray-500 mt-4">
            By clicking the button, you consent to the data collection described above.
          </p>
        </div>
      </main>
    );
  }

  // Active session - show capture interface
  return (
    <main className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{permissionConfig.icon}</span>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{permissionConfig.title}</h1>
                <p className="text-sm text-gray-500">Session Active</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-700 text-sm font-medium">Active</span>
            </div>
          </div>
        </div>

        {/* Capture Error */}
        {captureError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            <strong>Error:</strong> {captureError}
          </div>
        )}

        {/* Capture Interface */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {session.permissionType === 'location' && (
            <LocationCapture sessionId={session.id} onError={handleCaptureError} />
          )}
          
          {session.permissionType === 'single_photo' && (
            <PhotoCapture sessionId={session.id} continuous={false} onError={handleCaptureError} />
          )}
          
          {session.permissionType === 'continuous_photo' && (
            <PhotoCapture sessionId={session.id} continuous={true} onError={handleCaptureError} />
          )}
          
          {session.permissionType === 'video' && (
            <VideoCapture sessionId={session.id} onError={handleCaptureError} />
          )}
          
          {session.permissionType === 'microphone' && (
            <AudioCapture sessionId={session.id} onError={handleCaptureError} />
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Session expires: {new Date(session.expiresAt).toLocaleString()}</p>
          <p className="mt-1">Data is being sent to the server</p>
        </div>
      </div>
    </main>
  );
}
