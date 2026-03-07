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
      thankYou: 'Thank you! Your profile is being created. Please wait.',
      recording: 'Recording started. Please speak clearly.',
      nextQuestion: 'Great! Next question.',
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
      thankYou: 'धन्यवाद! आपकी प्रोफाइल बनाई जा रही है। कृपया प्रतीक्षा करें।',
      recording: 'रिकॉर्डिंग शुरू हो गई है। कृपया स्पष्ट बोलें।',
      nextQuestion: 'बहुत अच्छा! अगला सवाल।',
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
      thankYou: 'ధన్యవాదాలు! మీ ప్రొఫైల్ సృష్టించబడుతోంది. దయచేసి వేచి ఉండండి.',
      recording: 'రికార్డింగ్ ప్రారంభమైంది. దయచేసి స్పష్టంగా మాట్లాడండి.',
      nextQuestion: 'చాలా బాగుంది! తదుపరి ప్రశ్న.',
    }
  }
};

const QUESTIONS = ['question1', 'question2', 'question3'];

export default function JoinPage() {
  const router = useRouter();
  
  // Core states
  const [phase, setPhase] = useState('initial'); // initial, selectLanguage, interview, processing, success, error
  const [currentLanguage, setCurrentLanguage] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [location, setLocation] = useState(null);
  const [candidateId, setCandidateId] = useState(null);
  
  // Audio recording refs
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const allRecordingsRef = useRef([]); // Store all question recordings
  
  // Speech synthesis
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocation({ lat: 28.6139, lng: 77.2090 }) // Default Delhi
      );
    }
  }, []);

  // Text-to-Speech function
  const speak = useCallback((text, lang = 'en-US') => {
    return new Promise((resolve) => {
      if (!synth) {
        resolve();
        return;
      }
      
      // Cancel any ongoing speech
      synth.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        resolve();
      };
      
      synth.speak(utterance);
    });
  }, [synth]);

  // Handle initial mic tap - start language selection
  const handleMicTap = async () => {
    if (phase === 'initial') {
      setPhase('selectLanguage');
      await speak(INTERVIEW_SCRIPTS.en.prompts.selectLanguage, 'en-US');
    }
  };

  // Handle language selection
  const handleLanguageSelect = async (lang) => {
    setCurrentLanguage(lang);
    setPhase('interview');
    setCurrentQuestionIndex(0);
    allRecordingsRef.current = [];
    
    const script = INTERVIEW_SCRIPTS[lang];
    await speak(script.prompts.recording, script.voiceLang);
    await speak(script.prompts.question1, script.voiceLang);
  };

  // Start recording for current question
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

  // Stop recording and move to next question
  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);

      // Wait a moment for the recording to be saved
      await new Promise(resolve => setTimeout(resolve, 300));

      const script = INTERVIEW_SCRIPTS[currentLanguage];
      
      if (currentQuestionIndex < QUESTIONS.length - 1) {
        // More questions to go
        await speak(script.prompts.nextQuestion, script.voiceLang);
        setCurrentQuestionIndex(prev => prev + 1);
        const nextQuestion = QUESTIONS[currentQuestionIndex + 1];
        await speak(script.prompts[nextQuestion], script.voiceLang);
      } else {
        // All questions answered - process
        await speak(script.prompts.thankYou, script.voiceLang);
        setPhase('processing');
        await uploadAllRecordings();
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

  // Upload all recordings combined
  const uploadAllRecordings = async () => {
    try {
      // Combine all recordings into one blob
      const allBlobs = allRecordingsRef.current.map(r => r.blob);
      const combinedBlob = new Blob(allBlobs, { type: 'audio/webm' });

      const formData = new FormData();
      formData.append('audio', combinedBlob, 'interview.webm');
      formData.append('language', currentLanguage);
      formData.append('lang_code', currentLanguage); // Metadata for translation model
      formData.append('interview_type', 'structured_3q'); // Metadata
      formData.append('questions_answered', QUESTIONS.length.toString());
      
      if (location) {
        formData.append('lat', location.lat.toString());
        formData.append('lng', location.lng.toString());
      }

      const res = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setCandidateId(data.candidateId);
      setPhase('success');

    } catch (err) {
      console.error('Upload error:', err);
      setErrorMsg(err.message);
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
        
        {/* PHASE: Initial - Tap to Start */}
        {phase === 'initial' && (
          <>
            <h1 className="text-2xl font-bold text-center mb-2">Tap to Start</h1>
            <p className="text-[#8B95A5] text-center mb-12">
              Record a short voice interview
            </p>

            <MicButton 
              onClick={handleMicTap} 
              isRecording={false}
              isSpeaking={isSpeaking}
            />

            <p className="mt-8 text-sm text-[#8B95A5] text-center max-w-xs">
              You'll answer 3 simple questions to create your profile
            </p>
          </>
        )}

        {/* PHASE: Language Selection */}
        {phase === 'selectLanguage' && (
          <>
            <h1 className="text-2xl font-bold text-center mb-2">Select Your Language</h1>
            <p className="text-[#8B95A5] text-center mb-8">
              Choose the language you're comfortable speaking
            </p>

            {isSpeaking && (
              <div className="flex items-center gap-2 mb-8 text-[#0052CC]">
                <div className="w-3 h-3 bg-[#0052CC] rounded-full animate-pulse" />
                <span>AI is speaking...</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
              {Object.entries(INTERVIEW_SCRIPTS).map(([code, script]) => (
                <button
                  key={code}
                  onClick={() => handleLanguageSelect(code)}
                  disabled={isSpeaking}
                  className="bg-[#151B2D] hover:bg-[#1a2236] border border-white/10 rounded-xl p-4 text-left transition-all disabled:opacity-50"
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

            {isSpeaking && (
              <div className="flex items-center gap-2 mb-6 text-[#0052CC]">
                <div className="w-3 h-3 bg-[#0052CC] rounded-full animate-pulse" />
                <span>AI is speaking...</span>
              </div>
            )}

            {!isSpeaking && (
              <p className="text-[#8B95A5] text-center mb-8">
                {isRecording ? 'Tap when done answering' : 'Tap to start recording your answer'}
              </p>
            )}

            <MicButton 
              onClick={toggleRecording} 
              isRecording={isRecording}
              isSpeaking={isSpeaking}
              disabled={isSpeaking}
            />

            {isRecording && (
              <div className="mt-8 text-3xl font-mono font-bold text-red-400" data-testid="recording-timer">
                {formatTime(recordingTime)}
              </div>
            )}

            {/* Progress dots */}
            <div className="flex gap-2 mt-8">
              {QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-all ${
                    i < currentQuestionIndex
                      ? 'bg-[#36B37E]'
                      : i === currentQuestionIndex
                      ? 'bg-[#0052CC]'
                      : 'bg-[#8B95A5]/30'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* PHASE: Processing */}
        {phase === 'processing' && (
          <div className="text-center">
            <div className="w-20 h-20 border-4 border-[#0052CC] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-2">Processing...</h2>
            <p className="text-[#8B95A5]">AI Agent is creating your profile</p>
            <p className="text-[#8B95A5] text-sm mt-2">Language: {INTERVIEW_SCRIPTS[currentLanguage]?.name}</p>
          </div>
        )}

        {/* PHASE: Success */}
        {phase === 'success' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-[#36B37E] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20,6 9,17 4,12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Success!</h2>
            <p className="text-[#8B95A5] mb-2">Your profile is ready for employers</p>
            <p className="text-[#8B95A5] text-sm mb-8">
              Interview recorded in: {INTERVIEW_SCRIPTS[currentLanguage]?.name}
            </p>
            <button
              onClick={() => router.push('/hire')}
              className="bg-[#0052CC] hover:bg-[#003d99] text-white font-semibold px-8 py-4 rounded-xl transition-all"
              data-testid="review-profile-btn"
            >
              Review My Profile
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
            <h2 className="text-2xl font-bold mb-2">Error</h2>
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
        {location ? (
          <span>📍 Location detected</span>
        ) : (
          <span>📍 Detecting location...</span>
        )}
      </div>
    </div>
  );
}

// Mic Button Component with Pulse Animation
function MicButton({ onClick, isRecording, isSpeaking, disabled }) {
  return (
    <div className={`relative ${isRecording ? 'recording' : ''}`}>
      {/* Pulse Rings */}
      <div className={`mic-pulse-ring absolute inset-0 rounded-full scale-150 ${
        isRecording ? 'bg-red-500/30' : isSpeaking ? 'bg-[#36B37E]/30' : 'bg-[#0052CC]/30'
      }`} />
      <div 
        className={`mic-pulse-ring absolute inset-0 rounded-full scale-[1.8] ${
          isRecording ? 'bg-red-500/20' : isSpeaking ? 'bg-[#36B37E]/20' : 'bg-[#0052CC]/20'
        }`} 
        style={{ animationDelay: '0.3s' }} 
      />
      
      {/* Main Button */}
      <button
        onClick={onClick}
        disabled={disabled}
        className={`mic-pulse relative w-32 h-32 rounded-full flex items-center justify-center transition-all disabled:opacity-50 ${
          isRecording 
            ? 'bg-red-500 shadow-[0_0_60px_rgba(239,68,68,0.5)]' 
            : isSpeaking
            ? 'bg-[#36B37E] shadow-[0_0_60px_rgba(54,179,126,0.4)]'
            : 'bg-[#0052CC] shadow-[0_0_60px_rgba(0,82,204,0.4)]'
        }`}
        data-testid="mic-button"
      >
        {isSpeaking ? (
          // Speaker icon when AI is talking
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        ) : (
          // Mic icon
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
