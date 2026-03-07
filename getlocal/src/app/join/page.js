'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Interview questions in multiple languages
const INTERVIEW_SCRIPTS = {
  en: {
    name: 'English',
    voiceLang: 'en-US',
    prompts: {
      selectLanguage: 'Welcome to GetLocal. Please select your language by tapping: English, Hindi, or Telugu.',
      question1: 'Please tell us your full name.',
      question2: 'What type of work are you looking for? For example: Driver, Cook, Security Guard, or Helper.',
      question3: 'How many years of experience do you have in this field?',
      confirmation1: 'Got it! Next question.',
      confirmation2: 'Understood! Last question.',
      confirmation3: 'Thank you for completing the interview!',
      processing: 'Your profile is being created. Please wait.',
      recording: 'Recording. Please speak clearly.',
    }
  },
  hi: {
    name: 'हिंदी',
    voiceLang: 'hi-IN',
    prompts: {
      selectLanguage: 'GetLocal में आपका स्वागत है। कृपया अपनी भाषा चुनें।',
      question1: 'कृपया अपना पूरा नाम बताएं।',
      question2: 'आप किस तरह का काम ढूंढ रहे हैं? जैसे: ड्राइवर, कुक, सिक्योरिटी गार्ड, या हेल्पर।',
      question3: 'इस क्षेत्र में आपको कितने साल का अनुभव है?',
      confirmation1: 'समझ गया! अगला सवाल।',
      confirmation2: 'ठीक है! आखिरी सवाल।',
      confirmation3: 'इंटरव्यू पूरा करने के लिए धन्यवाद!',
      processing: 'आपकी प्रोफाइल बनाई जा रही है। कृपया प्रतीक्षा करें।',
      recording: 'रिकॉर्डिंग। कृपया स्पष्ट बोलें।',
    }
  },
  te: {
    name: 'తెలుగు',
    voiceLang: 'te-IN',
    prompts: {
      selectLanguage: 'GetLocal కి స్వాగతం. దయచేసి మీ భాషను ఎంచుకోండి।',
      question1: 'దయచేసి మీ పూర్తి పేరు చెప్పండి.',
      question2: 'మీరు ఏ రకమైన పని కోసం చూస్తున్నారు? ఉదాహరణకు: డ్రైవర్, కుక్, సెక్యూరిటీ గార్డ్ లేదా హెల్పర్.',
      question3: 'ఈ రంగంలో మీకు ఎన్ని సంవత్సరాల అనుభవం ఉంది?',
      confirmation1: 'అర్థమైంది! తదుపరి ప్రశ్న.',
      confirmation2: 'సరే! చివరి ప్రశ్న.',
      confirmation3: 'ఇంటర్వ్యూ పూర్తి చేసినందుకు ధన్యవాదాలు!',
      processing: 'మీ ప్రొఫైల్ సృష్టించబడుతోంది. దయచేసి వేచి ఉండండి.',
      recording: 'రికార్డింగ్. దయచేసి స్పష్టంగా మాట్లాడండి.',
    }
  }
};

const QUESTIONS = ['question1', 'question2', 'question3'];
const CONFIRMATIONS = ['confirmation1', 'confirmation2', 'confirmation3'];

export default function JoinPage() {
  const router = useRouter();
  
  // Core states
  const [phase, setPhase] = useState('initial');
  const [currentLanguage, setCurrentLanguage] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [location, setLocation] = useState(null);
  const [candidateId, setCandidateId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [audioLevels, setAudioLevels] = useState([]);
  
  // Audio recording refs
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const allRecordingsRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // Speech synthesis
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocation({ lat: 28.6139, lng: 77.2090 })
      );
    }
  }, []);

  // Haptic feedback
  const vibrate = useCallback((pattern = [50]) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  // Text-to-Speech function
  const speak = useCallback((text, lang = 'en-US') => {
    return new Promise((resolve) => {
      if (!synth) { resolve(); return; }
      synth.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => { setIsSpeaking(false); resolve(); };
      utterance.onerror = () => { setIsSpeaking(false); resolve(); };
      
      synth.speak(utterance);
    });
  }, [synth]);

  // Audio visualizer
  const startAudioVisualizer = useCallback((stream) => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 32;
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateLevels = () => {
        analyserRef.current.getByteFrequencyData(dataArray);
        const levels = Array.from(dataArray).slice(0, 8).map(v => v / 255);
        setAudioLevels(levels);
        animationFrameRef.current = requestAnimationFrame(updateLevels);
      };
      updateLevels();
    } catch (e) {
      console.log('Audio visualizer not supported');
    }
  }, []);

  const stopAudioVisualizer = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setAudioLevels([]);
  }, []);

  // Handle initial mic tap
  const handleMicTap = async () => {
    if (phase === 'initial') {
      vibrate([50]);
      setPhase('selectLanguage');
      await speak(INTERVIEW_SCRIPTS.en.prompts.selectLanguage, 'en-US');
    }
  };

  // Handle language selection
  const handleLanguageSelect = async (lang) => {
    vibrate([30, 50, 30]);
    setCurrentLanguage(lang);
    setPhase('interview');
    setCurrentQuestionIndex(0);
    allRecordingsRef.current = [];
    
    const script = INTERVIEW_SCRIPTS[lang];
    await speak(script.prompts.recording, script.voiceLang);
    await speak(script.prompts.question1, script.voiceLang);
  };

  // Start recording
  const startRecording = async () => {
    try {
      vibrate([50]);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start visualizer
      startAudioVisualizer(stream);
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        allRecordingsRef.current.push({
          questionIndex: currentQuestionIndex,
          blob,
          question: QUESTIONS[currentQuestionIndex]
        });
        stream.getTracks().forEach(track => track.stop());
        stopAudioVisualizer();
      };

      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Mic access error:', err);
      setErrorMsg('Please allow microphone access');
      setPhase('error');
    }
  };

  // Stop recording and provide confirmation
  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      vibrate([30, 30]);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);

      await new Promise(resolve => setTimeout(resolve, 300));

      const script = INTERVIEW_SCRIPTS[currentLanguage];
      
      // Play confirmation
      await speak(script.prompts[CONFIRMATIONS[currentQuestionIndex]], script.voiceLang);
      
      if (currentQuestionIndex < QUESTIONS.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        const nextQuestion = QUESTIONS[currentQuestionIndex + 1];
        await speak(script.prompts[nextQuestion], script.voiceLang);
      } else {
        // All questions answered - go to summary
        setPhase('summary');
        setTimeout(() => uploadAllRecordings(), 500);
      }
    }
  };

  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Redo current question
  const redoQuestion = async () => {
    vibrate([50]);
    // Remove last recording if exists for this question
    allRecordingsRef.current = allRecordingsRef.current.filter(
      r => r.questionIndex !== currentQuestionIndex
    );
    const script = INTERVIEW_SCRIPTS[currentLanguage];
    await speak(script.prompts[QUESTIONS[currentQuestionIndex]], script.voiceLang);
  };

  // Upload all recordings
  const uploadAllRecordings = async () => {
    try {
      setUploadProgress(10);
      
      // Validate we have recordings
      if (allRecordingsRef.current.length === 0) {
        throw new Error('No recordings to upload');
      }
      
      console.log('[CLIENT] Recordings to upload:', allRecordingsRef.current.length);
      
      const allBlobs = allRecordingsRef.current.map(r => r.blob);
      const combinedBlob = new Blob(allBlobs, { type: 'audio/webm' });
      
      console.log('[CLIENT] Combined blob size:', combinedBlob.size, 'bytes');
      console.log('[CLIENT] Combined blob type:', combinedBlob.type);
      
      setUploadProgress(30);

      // Create FormData - DO NOT set Content-Type header manually
      const formData = new FormData();
      formData.append('audio', combinedBlob, 'interview.webm');
      formData.append('language', currentLanguage || 'en');
      formData.append('lang_code', currentLanguage || 'en');
      formData.append('interview_type', 'structured_3q');
      formData.append('questions_answered', QUESTIONS.length.toString());
      
      if (location) {
        formData.append('lat', location.lat.toString());
        formData.append('lng', location.lng.toString());
      }

      console.log('[CLIENT] FormData keys:', [...formData.keys()]);
      
      setUploadProgress(50);

      // Make request WITHOUT setting Content-Type (browser sets it with boundary)
      console.log('[CLIENT] Sending upload request...');
      const res = await fetch('/nextapi/upload-audio', {
        method: 'POST',
        body: formData,
        // NOTE: Do NOT set Content-Type header - browser handles it for FormData
      });

      console.log('[CLIENT] Response status:', res.status);
      setUploadProgress(80);

      const data = await res.json();
      console.log('[CLIENT] Response data:', data);

      if (!res.ok) {
        console.error('[CLIENT] Upload failed:', data);
        throw new Error(data.details || data.error || 'Upload failed');
      }

      setUploadProgress(100);
      setCandidateId(data.candidateId);
      console.log('[CLIENT] Upload successful! Candidate ID:', data.candidateId);
      
      // Auto-redirect after 1.5 seconds
      setTimeout(() => {
        setPhase('success');
      }, 1500);

    } catch (err) {
      console.error('[CLIENT] Upload error:', err);
      console.error('[CLIENT] Error stack:', err.stack);
      setErrorMsg(err.message || 'Upload failed. Please try again.');
      setPhase('error');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const resetInterview = () => {
    setPhase('initial');
    setCurrentLanguage(null);
    setCurrentQuestionIndex(0);
    setErrorMsg('');
    setUploadProgress(0);
    allRecordingsRef.current = [];
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
        {currentLanguage && (
          <div className="bg-[#151B2D] border border-white/10 rounded-lg px-3 py-2 text-sm">
            {INTERVIEW_SCRIPTS[currentLanguage].name}
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-8">
        
        {/* PHASE: Initial */}
        {phase === 'initial' && (
          <>
            <h1 className="text-2xl font-bold text-center mb-2">Tap to Start</h1>
            <p className="text-[#8B95A5] text-center mb-12">Record a short voice interview</p>
            <MicButton onClick={handleMicTap} isRecording={false} isSpeaking={isSpeaking} />
            <p className="mt-8 text-sm text-[#8B95A5] text-center max-w-xs">
              You'll answer 3 simple questions to create your profile
            </p>
          </>
        )}

        {/* PHASE: Language Selection */}
        {phase === 'selectLanguage' && (
          <>
            <h1 className="text-2xl font-bold text-center mb-2">Select Your Language</h1>
            <p className="text-[#8B95A5] text-center mb-8">Choose the language you're comfortable speaking</p>
            {isSpeaking && <SpeakingIndicator />}
            <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
              {Object.entries(INTERVIEW_SCRIPTS).map(([code, script]) => (
                <button
                  key={code}
                  onClick={() => handleLanguageSelect(code)}
                  disabled={isSpeaking}
                  className="bg-[#151B2D] hover:bg-[#1a2236] border border-white/10 rounded-xl p-4 text-left transition-all disabled:opacity-50 active:scale-95"
                  data-testid={`lang-btn-${code}`}
                >
                  <span className="text-lg font-semibold">{script.name}</span>
                  <span className="text-[#8B95A5] text-sm ml-2">
                    {code === 'en' ? 'English' : code === 'hi' ? 'Hindi' : 'Telugu'}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* PHASE: Interview Questions */}
        {phase === 'interview' && currentLanguage && (
          <>
            <div className="text-center mb-4">
              <span className="bg-[#0052CC]/20 text-[#0052CC] px-3 py-1 rounded-full text-sm font-medium">
                Question {currentQuestionIndex + 1} of {QUESTIONS.length}
              </span>
            </div>

            <h1 className="text-xl font-bold text-center mb-2 px-4">
              {INTERVIEW_SCRIPTS[currentLanguage].prompts[QUESTIONS[currentQuestionIndex]]}
            </h1>

            {isSpeaking && <SpeakingIndicator />}

            {!isSpeaking && (
              <p className="text-[#8B95A5] text-center mb-6">
                {isRecording ? 'Tap when done' : 'Tap to record your answer'}
              </p>
            )}

            {/* Waveform Visualizer */}
            {isRecording && audioLevels.length > 0 && (
              <div className="flex items-center justify-center gap-1 h-12 mb-4" data-testid="waveform">
                {audioLevels.map((level, i) => (
                  <div
                    key={i}
                    className="w-2 bg-red-500 rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(8, level * 48)}px` }}
                  />
                ))}
              </div>
            )}

            <MicButton 
              onClick={toggleRecording} 
              isRecording={isRecording}
              isSpeaking={isSpeaking}
              disabled={isSpeaking}
            />

            {isRecording && (
              <div className="mt-6 text-3xl font-mono font-bold text-red-400" data-testid="recording-timer">
                {formatTime(recordingTime)}
              </div>
            )}

            {/* Redo Button */}
            {!isRecording && !isSpeaking && allRecordingsRef.current.some(r => r.questionIndex === currentQuestionIndex) && (
              <button
                onClick={redoQuestion}
                className="mt-4 text-[#8B95A5] hover:text-white text-sm flex items-center gap-2 transition-colors"
                data-testid="redo-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 4v6h6" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                Redo this answer
              </button>
            )}

            {/* Progress dots */}
            <div className="flex gap-2 mt-6">
              {QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-all ${
                    i < currentQuestionIndex ? 'bg-[#36B37E]'
                    : i === currentQuestionIndex ? 'bg-[#0052CC]'
                    : 'bg-[#8B95A5]/30'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* PHASE: Summary / Processing */}
        {phase === 'summary' && (
          <div className="text-center w-full max-w-sm">
            <div className="w-20 h-20 bg-[#0052CC]/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="animate-spin" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold mb-2">Interview Complete!</h2>
            <p className="text-[#8B95A5] mb-6">
              Recorded in {INTERVIEW_SCRIPTS[currentLanguage]?.name}
            </p>
            
            {/* Progress Bar */}
            <div className="w-full bg-[#151B2D] rounded-full h-3 mb-4 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#0052CC] to-[#36B37E] transition-all duration-500 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-[#8B95A5]">
              {uploadProgress < 50 ? 'Uploading audio...' 
               : uploadProgress < 100 ? 'Processing profile...' 
               : 'Almost done!'}
            </p>
          </div>
        )}

        {/* PHASE: Success */}
        {phase === 'success' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-[#36B37E] rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20,6 9,17 4,12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Profile Created!</h2>
            <p className="text-[#8B95A5] mb-2">Your profile is now visible to employers</p>
            <p className="text-[#8B95A5] text-sm mb-8">
              Language: {INTERVIEW_SCRIPTS[currentLanguage]?.name}
            </p>
            <button
              onClick={() => router.push('/hire')}
              className="bg-[#0052CC] hover:bg-[#003d99] text-white font-semibold px-8 py-4 rounded-xl transition-all active:scale-95"
              data-testid="view-profile-btn"
            >
              View My Profile
            </button>
          </div>
        )}

        {/* PHASE: Error */}
        {phase === 'error' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
            <p className="text-[#8B95A5] mb-8">{errorMsg}</p>
            <button
              onClick={resetInterview}
              className="bg-[#0052CC] hover:bg-[#003d99] text-white font-semibold px-8 py-4 rounded-xl transition-all"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Location Status */}
      <div className="text-center pb-4 text-xs text-[#8B95A5]">
        {location ? '📍 Location detected' : '📍 Detecting location...'}
      </div>
    </div>
  );
}

// Speaking Indicator Component
function SpeakingIndicator() {
  return (
    <div className="flex items-center gap-2 mb-6 text-[#36B37E]">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div 
            key={i} 
            className="w-2 h-2 bg-[#36B37E] rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-sm">AI is speaking...</span>
    </div>
  );
}

// Mic Button Component
function MicButton({ onClick, isRecording, isSpeaking, disabled }) {
  return (
    <div className={`relative ${isRecording ? 'recording' : ''}`}>
      <div className={`mic-pulse-ring absolute inset-0 rounded-full scale-150 ${
        isRecording ? 'bg-red-500/30' : isSpeaking ? 'bg-[#36B37E]/30' : 'bg-[#0052CC]/30'
      }`} />
      <div 
        className={`mic-pulse-ring absolute inset-0 rounded-full scale-[1.8] ${
          isRecording ? 'bg-red-500/20' : isSpeaking ? 'bg-[#36B37E]/20' : 'bg-[#0052CC]/20'
        }`} 
        style={{ animationDelay: '0.3s' }} 
      />
      
      <button
        onClick={onClick}
        disabled={disabled}
        className={`mic-pulse relative w-32 h-32 rounded-full flex items-center justify-center transition-all disabled:opacity-50 active:scale-95 ${
          isRecording ? 'bg-red-500 shadow-[0_0_60px_rgba(239,68,68,0.5)]' 
          : isSpeaking ? 'bg-[#36B37E] shadow-[0_0_60px_rgba(54,179,126,0.4)]'
          : 'bg-[#0052CC] shadow-[0_0_60px_rgba(0,82,204,0.4)]'
        }`}
        data-testid="mic-button"
      >
        {isSpeaking ? (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        ) : isRecording ? (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
      </button>
    </div>
  );
}