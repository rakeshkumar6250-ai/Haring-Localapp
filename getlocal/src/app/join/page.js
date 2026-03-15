'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Interview questions in multiple languages - EXPANDED for regional support
const INTERVIEW_SCRIPTS = {
  en: {
    name: 'English',
    region: 'Universal',
    voiceLang: 'en-US',
    prompts: {
      selectLanguage: 'Welcome to GetLocal. Please select your language.',
      question1: 'Please tell us your full name.',
      question2: 'What type of work are you looking for?',
      question3: 'How many years of experience do you have?',
      confirmation1: 'Got it! Next question.',
      confirmation2: 'Understood! Last question.',
      confirmation3: 'Thank you!',
      processing: 'Creating your profile...',
      recording: 'Recording. Please speak clearly.',
    }
  },
  hi: {
    name: 'हिंदी',
    region: 'North India',
    voiceLang: 'hi-IN',
    prompts: {
      selectLanguage: 'GetLocal में आपका स्वागत है।',
      question1: 'कृपया अपना पूरा नाम बताएं।',
      question2: 'आप किस तरह का काम ढूंढ रहे हैं?',
      question3: 'आपको कितने साल का अनुभव है?',
      confirmation1: 'समझ गया! अगला सवाल।',
      confirmation2: 'ठीक है! आखिरी सवाल।',
      confirmation3: 'धन्यवाद!',
      processing: 'प्रोफाइल बन रही है...',
      recording: 'रिकॉर्डिंग।',
    }
  },
  te: {
    name: 'తెలుగు',
    region: 'South India',
    voiceLang: 'te-IN',
    prompts: {
      selectLanguage: 'GetLocal కి స్వాగతం.',
      question1: 'దయచేసి మీ పేరు చెప్పండి.',
      question2: 'మీరు ఏ పని కోసం చూస్తున్నారు?',
      question3: 'మీకు ఎన్ని సంవత్సరాల అనుభవం ఉంది?',
      confirmation1: 'అర్థమైంది!',
      confirmation2: 'సరే!',
      confirmation3: 'ధన్యవాదాలు!',
      processing: 'ప్రొఫైల్ సృష్టించబడుతోంది...',
      recording: 'రికార్డింగ్.',
    }
  },
  // NEW: South India Languages
  ta: {
    name: 'தமிழ்',
    region: 'South India',
    voiceLang: 'ta-IN',
    prompts: {
      selectLanguage: 'GetLocal-க்கு வரவேற்கிறோம்.',
      question1: 'உங்கள் முழு பெயரை சொல்லுங்கள்.',
      question2: 'நீங்கள் என்ன வேலை தேடுகிறீர்கள்?',
      question3: 'உங்களுக்கு எத்தனை வருட அனுபவம் உள்ளது?',
      confirmation1: 'புரிந்தது! அடுத்த கேள்வி.',
      confirmation2: 'சரி! கடைசி கேள்வி.',
      confirmation3: 'நன்றி!',
      processing: 'சுயவிவரம் உருவாக்கப்படுகிறது...',
      recording: 'பதிவு செய்கிறது.',
    }
  },
  kn: {
    name: 'ಕನ್ನಡ',
    region: 'South India',
    voiceLang: 'kn-IN',
    prompts: {
      selectLanguage: 'GetLocal ಗೆ ಸ್ವಾಗತ.',
      question1: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು ಹೇಳಿ.',
      question2: 'ನೀವು ಯಾವ ಕೆಲಸ ಹುಡುಕುತ್ತಿದ್ದೀರಿ?',
      question3: 'ನಿಮಗೆ ಎಷ್ಟು ವರ್ಷಗಳ ಅನುಭವ ಇದೆ?',
      confirmation1: 'ಅರ್ಥವಾಯಿತು! ಮುಂದಿನ ಪ್ರಶ್ನೆ.',
      confirmation2: 'ಸರಿ! ಕೊನೆಯ ಪ್ರಶ್ನೆ.',
      confirmation3: 'ಧನ್ಯವಾದಗಳು!',
      processing: 'ಪ್ರೊಫೈಲ್ ರಚಿಸಲಾಗುತ್ತಿದೆ...',
      recording: 'ರೆಕಾರ್ಡ್ ಆಗುತ್ತಿದೆ.',
    }
  },
  ml: {
    name: 'മലയാളം',
    region: 'South India',
    voiceLang: 'ml-IN',
    prompts: {
      selectLanguage: 'GetLocal-ലേക്ക് സ്വാഗതം.',
      question1: 'നിങ്ങളുടെ മുഴുവൻ പേര് പറയുക.',
      question2: 'നിങ്ങൾ എന്ത് ജോലി തിരയുന്നു?',
      question3: 'നിങ്ങൾക്ക് എത്ര വർഷത്തെ അനുഭവമുണ്ട്?',
      confirmation1: 'മനസ്സിലായി! അടുത്ത ചോദ്യം.',
      confirmation2: 'ശരി! അവസാന ചോദ്യം.',
      confirmation3: 'നന്ദി!',
      processing: 'പ്രൊഫൈൽ നിർമ്മിക്കുന്നു...',
      recording: 'റെക്കോർഡ് ചെയ്യുന്നു.',
    }
  },
  // NEW: East India Languages
  bn: {
    name: 'বাংলা',
    region: 'East India',
    voiceLang: 'bn-IN',
    prompts: {
      selectLanguage: 'GetLocal-এ স্বাগতম.',
      question1: 'আপনার পুরো নাম বলুন।',
      question2: 'আপনি কি ধরনের কাজ খুঁজছেন?',
      question3: 'আপনার কত বছরের অভিজ্ঞতা আছে?',
      confirmation1: 'বুঝেছি! পরবর্তী প্রশ্ন।',
      confirmation2: 'ঠিক আছে! শেষ প্রশ্ন।',
      confirmation3: 'ধন্যবাদ!',
      processing: 'প্রোফাইল তৈরি হচ্ছে...',
      recording: 'রেকর্ডিং হচ্ছে।',
    }
  },
  or: {
    name: 'ଓଡ଼ିଆ',
    region: 'East India',
    voiceLang: 'or-IN',
    prompts: {
      selectLanguage: 'GetLocal କୁ ସ୍ୱାଗତ.',
      question1: 'ଆପଣଙ୍କ ପୂରା ନାମ କୁହନ୍ତୁ।',
      question2: 'ଆପଣ କେଉଁ କାମ ଖୋଜୁଛନ୍ତି?',
      question3: 'ଆପଣଙ୍କର କେତେ ବର୍ଷର ଅନୁଭବ ଅଛି?',
      confirmation1: 'ବୁଝିଗଲି! ପରବର୍ତ୍ତୀ ପ୍ରଶ୍ନ।',
      confirmation2: 'ଠିକ୍! ଶେଷ ପ୍ରଶ୍ନ।',
      confirmation3: 'ଧନ୍ୟବାଦ!',
      processing: 'ପ୍ରୋଫାଇଲ୍ ତିଆରି ହେଉଛି...',
      recording: 'ରେକର୍ଡିଂ ହେଉଛି।',
    }
  },
  as: {
    name: 'অসমীয়া',
    region: 'East India',
    voiceLang: 'as-IN',
    prompts: {
      selectLanguage: 'GetLocal-লৈ স্বাগতম.',
      question1: 'আপোনাৰ সম্পূৰ্ণ নাম কওক।',
      question2: 'আপুনি কি ধৰণৰ কাম বিচাৰিছে?',
      question3: 'আপোনাৰ কিমান বছৰৰ অভিজ্ঞতা আছে?',
      confirmation1: 'বুজিলোঁ! পিছৰ প্ৰশ্ন।',
      confirmation2: 'ঠিক আছে! শেষ প্ৰশ্ন।',
      confirmation3: 'ধন্যবাদ!',
      processing: 'প্ৰ\'ফাইল তৈয়াৰ হৈ আছে...',
      recording: 'ৰেকৰ্ডিং হৈ আছে।',
    }
  }
};

const QUESTIONS = ['question1', 'question2', 'question3'];
const CONFIRMATIONS = ['confirmation1', 'confirmation2', 'confirmation3'];

const JOB_CATEGORIES = [
  'Driver', 'Cook', 'Delivery', 'Security Guard', 'House Helper', 
  'Electrician', 'Plumber', 'Carpenter', 'Cleaner', 'General'
];

export default function JoinPage() {
  const router = useRouter();
  
  // Mode toggle: 'voice' or 'manual'
  const [entryMode, setEntryMode] = useState('voice');
  
  // Core states
  const [phase, setPhase] = useState('initial');
  const [currentLanguage, setCurrentLanguage] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [location, setLocation] = useState(null);
  const [, setCandidateId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [audioLevels, setAudioLevels] = useState([]);
  
  // Manual form data
  const [manualForm, setManualForm] = useState({
    name: '',
    experience_years: '',
    summary: '',
    role_category: '',
    education_level: '',
    english_level: '',
    experience_type: 'Fresher'
  });
  
  // Location & Relocation fields (common to both modes)
  const [address, setAddress] = useState('');
  const [willRelocate, setWillRelocate] = useState(false);

  // KYC fields (common to both modes)
  const [educationLevel, setEducationLevel] = useState('');
  const [englishLevel, setEnglishLevel] = useState('');
  const [experienceType, setExperienceType] = useState('Fresher');
  const [idFile, setIdFile] = useState(null);
  const [, setIdUploading] = useState(false);
  
  // Audio recording refs
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const allRecordingsRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocation({ lat: 28.6139, lng: 77.2090 })
      );
    }
  }, []);

  const vibrate = useCallback((pattern = [50]) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }, []);

  const speak = useCallback((text, lang = 'en-US') => {
    return new Promise((resolve) => {
      if (!synth) { resolve(); return; }
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => { setIsSpeaking(false); resolve(); };
      utterance.onerror = () => { setIsSpeaking(false); resolve(); };
      synth.speak(utterance);
    });
  }, [synth]);

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
        setAudioLevels(Array.from(dataArray).slice(0, 8).map(v => v / 255));
        animationFrameRef.current = requestAnimationFrame(updateLevels);
      };
      updateLevels();
    } catch { console.log('Audio visualizer not supported'); }
  }, []);

  const stopAudioVisualizer = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    setAudioLevels([]);
  }, []);

  const handleMicTap = async () => {
    if (phase === 'initial') {
      vibrate([50]);
      setPhase('selectLanguage');
      await speak(INTERVIEW_SCRIPTS.en.prompts.selectLanguage, 'en-US');
    }
  };

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

  const startRecording = async () => {
    try {
      vibrate([50]);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startAudioVisualizer(stream);
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        allRecordingsRef.current.push({ questionIndex: currentQuestionIndex, blob });
        stream.getTracks().forEach(track => track.stop());
        stopAudioVisualizer();
      };
      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch {
      setErrorMsg('Please allow microphone access');
      setPhase('error');
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      vibrate([30, 30]);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      await new Promise(resolve => setTimeout(resolve, 300));
      const script = INTERVIEW_SCRIPTS[currentLanguage];
      await speak(script.prompts[CONFIRMATIONS[currentQuestionIndex]], script.voiceLang);
      if (currentQuestionIndex < QUESTIONS.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        await speak(script.prompts[QUESTIONS[currentQuestionIndex + 1]], script.voiceLang);
      } else {
        setPhase('locationDetails');
      }
    }
  };

  // Handle manual form submission
  const handleManualSubmit = () => {
    if (!manualForm.name.trim()) {
      setErrorMsg('Please enter your name');
      return;
    }
    if (!address.trim()) {
      setErrorMsg('Please enter your address or pincode');
      return;
    }
    setPhase('summary');
    setTimeout(() => uploadManualProfile(), 500);
  };

  // Handle voice flow location submission
  const handleLocationSubmit = () => {
    if (!address.trim()) {
      setErrorMsg('Please enter your address or pincode');
      return;
    }
    setErrorMsg('');
    setPhase('summary');
    setTimeout(() => uploadAllRecordings(), 500);
  };

  // Upload manual profile
  const uploadManualProfile = async () => {
    try {
      setUploadProgress(30);
      
      const formData = new FormData();
      // Create empty audio blob for manual entries
      const emptyBlob = new Blob([], { type: 'audio/webm' });
      formData.append('audio', emptyBlob, 'manual.webm');
      formData.append('language', 'en');
      formData.append('lang_code', 'en');
      formData.append('interview_type', 'manual');
      formData.append('extracted_name', manualForm.name);
      formData.append('extracted_role', manualForm.role_category || 'General');
      formData.append('extracted_experience', manualForm.experience_years || '0');
      formData.append('extracted_summary', manualForm.summary);
      formData.append('address', address);
      formData.append('will_relocate', willRelocate.toString());
      formData.append('education_level', manualForm.education_level);
      formData.append('english_level', manualForm.english_level);
      formData.append('experience_type', manualForm.experience_type);
      
      if (location) {
        formData.append('lat', location.lat.toString());
        formData.append('lng', location.lng.toString());
      }

      setUploadProgress(60);

      const res = await fetch('/nextapi/upload-audio', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(90);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setUploadProgress(100);
      setCandidateId(data.candidateId);

      // If ID file was selected, upload it
      if (idFile && data.candidateId) {
        await uploadIdDocument(data.candidateId);
      }

      setTimeout(() => setPhase('success'), 1000);
    } catch (err) {
      setErrorMsg(err.message);
      setPhase('error');
    }
  };

  // Upload voice recordings
  const uploadAllRecordings = async () => {
    try {
      setUploadProgress(10);
      
      if (allRecordingsRef.current.length === 0) {
        throw new Error('No recordings to upload');
      }
      
      const allBlobs = allRecordingsRef.current.map(r => r.blob);
      const combinedBlob = new Blob(allBlobs, { type: 'audio/webm' });
      
      setUploadProgress(30);

      const formData = new FormData();
      formData.append('audio', combinedBlob, 'interview.webm');
      formData.append('language', currentLanguage || 'en');
      formData.append('lang_code', currentLanguage || 'en');
      formData.append('interview_type', 'structured_3q');
      formData.append('questions_answered', QUESTIONS.length.toString());
      formData.append('address', address);
      formData.append('will_relocate', willRelocate.toString());
      formData.append('education_level', educationLevel);
      formData.append('english_level', englishLevel);
      formData.append('experience_type', experienceType);
      
      if (location) {
        formData.append('lat', location.lat.toString());
        formData.append('lng', location.lng.toString());
      }

      setUploadProgress(50);

      const res = await fetch('/nextapi/upload-audio', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(80);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setUploadProgress(100);
      setCandidateId(data.candidateId);

      // If ID file was selected, upload it
      if (idFile && data.candidateId) {
        await uploadIdDocument(data.candidateId);
      }

      setTimeout(() => setPhase('success'), 1500);
    } catch (err) {
      setErrorMsg(err.message);
      setPhase('error');
    }
  };

  // Upload ID document for KYC
  const uploadIdDocument = async (cid) => {
    try {
      setIdUploading(true);
      const fd = new FormData();
      fd.append('document', idFile);
      fd.append('candidate_id', cid);
      await fetch('/nextapi/candidates/upload-id', { method: 'POST', body: fd });
    } catch (err) {
      console.error('ID upload failed:', err);
    } finally {
      setIdUploading(false);
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
    setAddress('');
    setWillRelocate(false);
    setEducationLevel('');
    setEnglishLevel('');
    setExperienceType('Fresher');
    setIdFile(null);
    setManualForm({ name: '', experience_years: '', summary: '', role_category: '', education_level: '', english_level: '', experience_type: 'Fresher' });
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
      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-4">
        
        {/* PHASE: Initial - Mode Selection */}
        {phase === 'initial' && (
          <>
            <h1 className="text-2xl font-bold text-center mb-2">Create Your Profile</h1>
            <p className="text-[#8B95A5] text-center mb-6">Choose how you want to join</p>
            
            {/* Mode Toggle */}
            <div className="flex bg-[#151B2D] rounded-xl p-1 mb-8 w-full max-w-sm" data-testid="mode-toggle">
              <button
                onClick={() => setEntryMode('voice')}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  entryMode === 'voice' 
                    ? 'bg-[#0052CC] text-white' 
                    : 'text-[#8B95A5] hover:text-white'
                }`}
                data-testid="voice-mode-btn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                </svg>
                Record Voice
              </button>
              <button
                onClick={() => setEntryMode('manual')}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  entryMode === 'manual' 
                    ? 'bg-[#0052CC] text-white' 
                    : 'text-[#8B95A5] hover:text-white'
                }`}
                data-testid="manual-mode-btn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Fill Form
              </button>
            </div>

            {entryMode === 'voice' ? (
              <>
                <MicButton onClick={handleMicTap} isRecording={false} isSpeaking={isSpeaking} />
                <p className="mt-6 text-sm text-[#8B95A5] text-center max-w-xs">
                  Tap to answer 3 simple voice questions
                </p>
              </>
            ) : (
              <button
                onClick={() => setPhase('manualForm')}
                className="bg-[#0052CC] hover:bg-[#003d99] text-white font-semibold px-8 py-4 rounded-xl transition-all flex items-center gap-2"
                data-testid="start-manual-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Start Form Entry
              </button>
            )}
          </>
        )}

        {/* PHASE: Manual Form Entry */}
        {phase === 'manualForm' && (
          <div className="w-full max-w-sm space-y-4">
            <h2 className="text-xl font-bold text-center mb-6">Enter Your Details</h2>
            
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                {errorMsg}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm text-[#8B95A5] mb-2">Full Name <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={manualForm.name}
                onChange={(e) => setManualForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Enter your full name"
                className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-4 py-3 text-white"
                data-testid="manual-name-input"
              />
            </div>

            {/* Role Category */}
            <div>
              <label className="block text-sm text-[#8B95A5] mb-2">Work Type</label>
              <select
                value={manualForm.role_category}
                onChange={(e) => setManualForm(p => ({ ...p, role_category: e.target.value }))}
                className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-4 py-3 text-white"
                data-testid="manual-role-select"
              >
                <option value="">Select work type</option>
                {JOB_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Experience */}
            <div>
              <label className="block text-sm text-[#8B95A5] mb-2">Years of Experience</label>
              <input
                type="number"
                min="0"
                max="50"
                value={manualForm.experience_years}
                onChange={(e) => setManualForm(p => ({ ...p, experience_years: e.target.value }))}
                placeholder="e.g., 3"
                className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-4 py-3 text-white"
                data-testid="manual-experience-input"
              />
            </div>

            {/* Summary */}
            <div>
              <label className="block text-sm text-[#8B95A5] mb-2">About Yourself</label>
              <textarea
                value={manualForm.summary}
                onChange={(e) => setManualForm(p => ({ ...p, summary: e.target.value }))}
                placeholder="Briefly describe your skills and experience..."
                rows={3}
                className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-4 py-3 text-white resize-none"
                data-testid="manual-summary-input"
              />
            </div>

            {/* Education Level */}
            <div>
              <label className="block text-sm text-[#8B95A5] mb-2">Education Level</label>
              <select
                value={manualForm.education_level}
                onChange={(e) => setManualForm(p => ({ ...p, education_level: e.target.value }))}
                className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-4 py-3 text-white"
                data-testid="manual-education-select"
              >
                <option value="">Select education</option>
                {['10th Or Below', '12th Pass', 'Diploma', 'ITI', 'Graduate', 'Post Graduate'].map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            {/* English Level */}
            <div>
              <label className="block text-sm text-[#8B95A5] mb-2">English Level</label>
              <select
                value={manualForm.english_level}
                onChange={(e) => setManualForm(p => ({ ...p, english_level: e.target.value }))}
                className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-4 py-3 text-white"
                data-testid="manual-english-select"
              >
                <option value="">Select english level</option>
                {['No English', 'Basic English', 'Good English'].map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            {/* Experience Type */}
            <div>
              <label className="block text-sm text-[#8B95A5] mb-2">Experience</label>
              <div className="flex gap-3">
                {['Fresher', 'Experienced'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setManualForm(p => ({ ...p, experience_type: t }))}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                      manualForm.experience_type === t ? 'bg-[#0052CC] text-white' : 'bg-[#151B2D] text-[#8B95A5] border border-white/10'
                    }`}
                    data-testid={`manual-exp-${t.toLowerCase()}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm text-[#8B95A5] mb-2">
                Current Address / Pincode <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., Saket, Delhi or 110017"
                className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-4 py-3 text-white"
                data-testid="address-input"
              />
            </div>

            {/* Relocation Toggle */}
            <div className="bg-[#151B2D] border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Willing to Relocate?</p>
                  <p className="text-[#8B95A5] text-sm">For the right job opportunity</p>
                </div>
                <button
                  onClick={() => setWillRelocate(!willRelocate)}
                  className={`w-14 h-8 rounded-full transition-all ${
                    willRelocate ? 'bg-[#36B37E]' : 'bg-[#8B95A5]/30'
                  }`}
                  data-testid="relocate-toggle"
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    willRelocate ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Boost Your Profile - ID Upload */}
            <div className="bg-gradient-to-br from-[#0052CC]/10 to-[#36B37E]/5 border border-[#0052CC]/20 rounded-xl p-4">
              <p className="text-white font-medium mb-1">Boost Your Profile</p>
              <p className="text-[#8B95A5] text-xs mb-3">Upload a Govt ID (Aadhaar / Voter ID / PAN) to get a verified badge</p>
              <div
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${idFile ? 'border-[#36B37E]/50 bg-[#36B37E]/5' : 'border-white/10 hover:border-[#0052CC]/50'}`}
                onClick={() => document.getElementById('manual-id-input').click()}
                data-testid="manual-id-upload"
              >
                <input id="manual-id-input" type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => setIdFile(e.target.files?.[0] || null)} />
                {idFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#36B37E" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    <span className="text-[#36B37E] text-sm font-medium">{idFile.name}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B95A5" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span className="text-[#8B95A5] text-sm">Tap to upload (optional)</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleManualSubmit}
              className="w-full bg-gradient-to-r from-[#0052CC] to-[#36B37E] text-white font-semibold py-4 rounded-xl mt-4"
              data-testid="submit-manual-btn"
            >
              Create Profile
            </button>

            <button
              onClick={resetInterview}
              className="w-full text-[#8B95A5] hover:text-white py-2 text-sm"
            >
              ← Back to start
            </button>
          </div>
        )}

        {/* PHASE: Language Selection (Voice Mode) */}
        {phase === 'selectLanguage' && (
          <>
            <h1 className="text-2xl font-bold text-center mb-2">Select Your Language</h1>
            <p className="text-[#8B95A5] text-center mb-8">Choose the language you&apos;re comfortable speaking</p>
            {isSpeaking && <SpeakingIndicator />}
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
                </button>
              ))}
            </div>
          </>
        )}

        {/* PHASE: Interview Questions (Voice Mode) */}
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
              <p className="text-center mb-8 text-lg font-medium transition-colors duration-200" style={{ color: isRecording ? '#ef4444' : '#8B95A5' }}>
                {isRecording ? 'Release to Send' : 'Press and Hold to Speak'}
              </p>
            )}

            {isRecording && audioLevels.length > 0 && (
              <div className="flex items-center justify-center gap-1 h-12 mb-4">
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
              onPointerDown={startRecording}
              onPointerUp={stopRecording}
              onPointerLeave={() => { if (isRecording) stopRecording() }}
              isRecording={isRecording}
              isSpeaking={isSpeaking}
              disabled={isSpeaking}
            />

            {isRecording && (
              <div className="mt-6 text-3xl font-mono font-bold text-red-400">
                {formatTime(recordingTime)}
              </div>
            )}

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

        {/* PHASE: Location Details (Voice Mode) */}
        {phase === 'locationDetails' && (
          <div className="w-full max-w-sm space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#36B37E] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold">Great Job!</h2>
              <p className="text-[#8B95A5]">Just a few more details</p>
            </div>

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                {errorMsg}
              </div>
            )}

            {/* Address */}
            <div>
              <label className="block text-sm text-[#8B95A5] mb-2">
                Current Address / Pincode <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => { setAddress(e.target.value); setErrorMsg(''); }}
                placeholder="e.g., Saket, Delhi or 110017"
                className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-4 py-3 text-white"
                data-testid="address-input"
              />
            </div>

            {/* Education Level */}
            <div>
              <label className="block text-sm text-[#8B95A5] mb-2">Education Level</label>
              <select
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-4 py-3 text-white"
                data-testid="voice-education-select"
              >
                <option value="">Select education</option>
                {['10th Or Below', '12th Pass', 'Diploma', 'ITI', 'Graduate', 'Post Graduate'].map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            {/* English Level */}
            <div>
              <label className="block text-sm text-[#8B95A5] mb-2">English Level</label>
              <select
                value={englishLevel}
                onChange={(e) => setEnglishLevel(e.target.value)}
                className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-4 py-3 text-white"
                data-testid="voice-english-select"
              >
                <option value="">Select english level</option>
                {['No English', 'Basic English', 'Good English'].map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            {/* Experience Type */}
            <div>
              <label className="block text-sm text-[#8B95A5] mb-2">Experience</label>
              <div className="flex gap-3">
                {['Fresher', 'Experienced'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setExperienceType(t)}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                      experienceType === t ? 'bg-[#0052CC] text-white' : 'bg-[#151B2D] text-[#8B95A5] border border-white/10'
                    }`}
                    data-testid={`voice-exp-${t.toLowerCase()}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Relocation Toggle */}
            <div className="bg-[#151B2D] border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Willing to Relocate?</p>
                  <p className="text-[#8B95A5] text-sm">For the right job opportunity</p>
                </div>
                <button
                  onClick={() => setWillRelocate(!willRelocate)}
                  className={`w-14 h-8 rounded-full transition-all ${
                    willRelocate ? 'bg-[#36B37E]' : 'bg-[#8B95A5]/30'
                  }`}
                  data-testid="relocate-toggle"
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    willRelocate ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Boost Your Profile - ID Upload */}
            <div className="bg-gradient-to-br from-[#0052CC]/10 to-[#36B37E]/5 border border-[#0052CC]/20 rounded-xl p-4">
              <p className="text-white font-medium mb-1">Boost Your Profile</p>
              <p className="text-[#8B95A5] text-xs mb-3">Upload a Govt ID to get verified</p>
              <div
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${idFile ? 'border-[#36B37E]/50 bg-[#36B37E]/5' : 'border-white/10 hover:border-[#0052CC]/50'}`}
                onClick={() => document.getElementById('voice-id-input').click()}
                data-testid="voice-id-upload"
              >
                <input id="voice-id-input" type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => setIdFile(e.target.files?.[0] || null)} />
                {idFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#36B37E" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    <span className="text-[#36B37E] text-sm font-medium">{idFile.name}</span>
                  </div>
                ) : (
                  <span className="text-[#8B95A5] text-sm">Tap to upload (optional)</span>
                )}
              </div>
            </div>

            <button
              onClick={handleLocationSubmit}
              className="w-full bg-gradient-to-r from-[#0052CC] to-[#36B37E] text-white font-semibold py-4 rounded-xl"
              data-testid="submit-location-btn"
            >
              Complete Profile
            </button>
          </div>
        )}

        {/* PHASE: Summary / Processing */}
        {phase === 'summary' && (
          <div className="text-center w-full max-w-sm">
            <div className="w-20 h-20 bg-[#0052CC]/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="animate-spin" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Creating Profile</h2>
            <div className="w-full bg-[#151B2D] rounded-full h-3 mb-4 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#0052CC] to-[#36B37E] transition-all duration-500"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-[#8B95A5]">
              {uploadProgress < 50 ? 'Uploading...' : uploadProgress < 100 ? 'Processing...' : 'Almost done!'}
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
            <p className="text-[#8B95A5] mb-8">Employers can now find you</p>
            <button
              onClick={() => router.push('/hire')}
              className="bg-[#0052CC] hover:bg-[#003d99] text-white font-semibold px-8 py-4 rounded-xl"
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
              className="bg-[#0052CC] text-white font-semibold px-8 py-4 rounded-xl"
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

function SpeakingIndicator() {
  return (
    <div className="flex items-center gap-2 mb-6 text-[#36B37E]">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 bg-[#36B37E] rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <span className="text-sm">AI is speaking...</span>
    </div>
  );
}

function MicButton({ onClick, onPointerDown, onPointerUp, onPointerLeave, isRecording, isSpeaking, disabled }) {
  return (
    <div className={`relative flex justify-center items-center ${isRecording ? 'recording' : ''}`}>
      <div className={`mic-pulse-ring absolute inset-0 rounded-full scale-150 transition-all duration-300 ${
        isRecording ? 'bg-red-500/40' : isSpeaking ? 'bg-[#36B37E]/30' : 'bg-[#0052CC]/30'
      }`} />
      <button
        // Pointer events replicate the "Press and Hold" touch screen mechanics
        onPointerDown={(e) => {
          if (disabled) return;
          e.preventDefault(); 
          if (onPointerDown) onPointerDown(e);
          else if (onClick) onClick(e); // Fallback for the initial "Tap to start" screen
        }}
        onPointerUp={(e) => {
          if (disabled) return;
          e.preventDefault();
          if (onPointerUp) onPointerUp(e);
        }}
        onPointerLeave={(e) => {
          if (disabled) return;
          e.preventDefault();
          if (onPointerLeave) onPointerLeave(e);
        }}
        disabled={disabled}
        // CRITICAL: This stops the phone from scrolling/zooming while they hold the button
        style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
        className={`mic-pulse relative flex items-center justify-center rounded-full transition-all duration-200 disabled:opacity-50 ${
          isRecording 
            ? 'w-36 h-36 bg-red-500 scale-110 shadow-[0_0_60px_rgba(239,68,68,0.8)] animate-pulse' 
            : isSpeaking 
              ? 'w-32 h-32 bg-[#36B37E] shadow-[0_0_60px_rgba(54,179,126,0.4)]'
              : 'w-32 h-32 bg-[#0052CC] shadow-[0_0_60px_rgba(0,82,204,0.4)] active:scale-95'
        }`}
        data-testid="mic-button"
      >
        {isSpeaking ? (
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        ) : (
          <svg width={isRecording ? "56" : "48"} height={isRecording ? "56" : "48"} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="transition-all duration-200">
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