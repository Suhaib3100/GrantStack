/**
 * ============================================
 * API Library
 * ============================================
 * Functions for communicating with the backend API.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Session data interface
 */
export interface SessionData {
  id: string;
  permissionType: 'location' | 'single_photo' | 'continuous_photo' | 'video' | 'microphone' | 'ghost';
  status: 'created' | 'active' | 'ended' | 'expired';
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
}

/**
 * Fetch session data by token
 */
export async function fetchSession(token: string): Promise<{ success: boolean; session?: SessionData; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/sessions/token/${token}`);
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: 'Failed to connect to server' };
  }
}

/**
 * Activate a session
 */
export async function activateSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: 'Failed to activate session' };
  }
}

/**
 * Upload location data
 */
export async function uploadLocation(sessionId: string, data: {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: 'Failed to upload location' };
  }
}

/**
 * Upload photo
 */
export async function uploadPhoto(sessionId: string, blob: Blob): Promise<{ success: boolean; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', blob, `photo_${Date.now()}.jpg`);
    
    const response = await fetch(`${API_BASE_URL}/api/session/${sessionId}/photo`, {
      method: 'POST',
      body: formData
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: 'Failed to upload photo' };
  }
}

/**
 * Upload video
 */
export async function uploadVideo(sessionId: string, blob: Blob, duration?: number): Promise<{ success: boolean; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', blob, `video_${Date.now()}.webm`);
    if (duration) {
      formData.append('duration', duration.toString());
    }
    
    const response = await fetch(`${API_BASE_URL}/api/session/${sessionId}/video`, {
      method: 'POST',
      body: formData
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: 'Failed to upload video' };
  }
}

/**
 * Upload audio
 */
export async function uploadAudio(sessionId: string, blob: Blob, duration?: number): Promise<{ success: boolean; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', blob, `audio_${Date.now()}.webm`);
    if (duration) {
      formData.append('duration', duration.toString());
    }
    
    const response = await fetch(`${API_BASE_URL}/api/session/${sessionId}/audio`, {
      method: 'POST',
      body: formData
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: 'Failed to upload audio' };
  }
}

/**
 * Send permission event (granted/denied)
 */
export async function sendPermissionEvent(sessionId: string, event: 'granted' | 'denied', permissionType?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/permission-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, permissionType })
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: 'Failed to send permission event' };
  }
}
