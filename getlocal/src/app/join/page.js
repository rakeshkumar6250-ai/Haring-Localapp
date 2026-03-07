'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinPage() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, recording, processing, success, error
  const [errorMsg, setErrorMsg] = useState('');
  const [language, setLanguage] = useState('en');
  const [location, setLocation] = useState(null);
  const [candidateId, setCandidateId] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => {
          console.warn('Geolocation error:', err);
          // Default to a central location if denied
          setLocation({ lat: 28.6139, lng: 77.2090 }); // Delhi
        }
      );
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      setStatus('recording');
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Mic access error:', err);
      setErrorMsg('Please allow microphone access to continue');
      setStatus('error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      setStatus('processing');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Upload audio when blob is ready
  useEffect(() => {
    if (audioBlob && status === 'processing') {
      uploadAudio();
    }
  }, [audioBlob, status]);

  const uploadAudio = async () => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'interview.webm');
      formData.append('language', language);
      if (location) {
        formData.append('lat', location.lat.toString());
        formData.append('lng', location.lng.toString());
      }

      const res = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setCandidateId(data.candidateId);
      setStatus('success');

    } catch (err) {
      console.error('Upload error:', err);
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[#0052CC] rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">G</span>
          </div>
          <span className="font-bold text-xl">GetLocal</span>
        </div>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="bg-[#151B2D] border border-white/10 rounded-lg px-3 py-2 text-sm"
          data-testid="language-select"
        >
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
          <option value="ta">தமிழ்</option>
          <option value="te">తెలుగు</option>
        </select>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-16">
        {status === 'idle' || status === 'recording' ? (
          <>
            <h1 className="text-2xl font-bold text-center mb-2">
              {status === 'recording' ? 'Recording...' : 'Tap to Start'}
            </h1>
            <p className="text-[#8B95A5] text-center mb-12">
              {status === 'recording' 
                ? 'Tell us about your work experience' 
                : 'Record a short voice intro (30-60 sec)'}
            </p>

            {/* Mic Button with Pulse Animation */}
            <div className={`relative ${status === 'recording' ? 'recording' : ''}`}>
              {/* Pulse Rings */}
              <div className="mic-pulse-ring absolute inset-0 bg-[#0052CC]/30 rounded-full scale-150" />
              <div className="mic-pulse-ring absolute inset-0 bg-[#0052CC]/20 rounded-full scale-[1.8]" style={{ animationDelay: '0.3s' }} />
              
              {/* Main Button */}
              <button
                onClick={toggleRecording}
                className={`mic-pulse relative w-32 h-32 rounded-full flex items-center justify-center transition-all ${
                  status === 'recording' 
                    ? 'bg-red-500 shadow-[0_0_60px_rgba(239,68,68,0.5)]' 
                    : 'bg-[#0052CC] shadow-[0_0_60px_rgba(0,82,204,0.4)]'
                }`}
                data-testid="mic-button"
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>
            </div>

            {/* Timer */}
            {status === 'recording' && (
              <div className="mt-8 text-3xl font-mono font-bold text-red-400" data-testid="recording-timer">
                {formatTime(recordingTime)}
              </div>
            )}

            {/* Instructions */}
            <p className="mt-8 text-sm text-[#8B95A5] text-center max-w-xs">
              {status === 'recording' 
                ? 'Tap the button again to stop' 
                : 'Your voice intro helps employers understand your skills'}
            </p>
          </>
        ) : status === 'processing' ? (
          <div className="text-center">
            <div className="w-20 h-20 border-4 border-[#0052CC] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-2">Processing...</h2>
            <p className="text-[#8B95A5]">AI Agent is creating your profile</p>
          </div>
        ) : status === 'success' ? (
          <div className="text-center">
            <div className="w-20 h-20 bg-[#36B37E] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20,6 9,17 4,12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Success!</h2>
            <p className="text-[#8B95A5] mb-8">Your profile is ready for employers</p>
            <button
              onClick={() => router.push('/hire')}
              className="bg-[#0052CC] hover:bg-[#003d99] text-white font-semibold px-8 py-4 rounded-xl transition-all"
              data-testid="review-profile-btn"
            >
              Review My Profile
            </button>
          </div>
        ) : status === 'error' ? (
          <div className="text-center">
            <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Error</h2>
            <p className="text-[#8B95A5] mb-8">{errorMsg}</p>
            <button
              onClick={() => { setStatus('idle'); setErrorMsg(''); }}
              className="bg-[#0052CC] hover:bg-[#003d99] text-white font-semibold px-8 py-4 rounded-xl transition-all"
            >
              Try Again
            </button>
          </div>
        ) : null}
      </div>

      {/* Location Status */}
      <div className="text-center pb-4 text-xs text-[#8B95A5]">
        {location ? (
          <span>📍 Location detected</span>
        ) : (
          <span>📍 Detecting location...</span>
        )}
      </div>
    </div>
  );
}