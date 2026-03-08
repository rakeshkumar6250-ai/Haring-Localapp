'use client';

import { useState, useEffect, useRef } from 'react';
import BottomNav from '@/components/BottomNav';

// Mock commute times based on distance
const MOCK_COMMUTES = [
  '🚇 15 mins by bus',
  '🚌 20 mins by metro',
  '🚶 10 mins walk',
  '🚗 25 mins by auto',
  '🚇 12 mins by bus',
  '🚌 30 mins by metro'
];

const PERKS_LABELS = {
  meals: { label: 'Free Meals', icon: '🍽️' },
  accommodation: { label: 'Accommodation', icon: '🏠' },
  pf_esi: { label: 'PF/ESI', icon: '🏥' },
  transport: { label: 'Transport', icon: '🚌' },
  uniform: { label: 'Uniform', icon: '👔' },
  bonus: { label: 'Bonus', icon: '💰' }
};

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [speakingJobId, setSpeakingJobId] = useState(null);
  const synthRef = useRef(null);

  useEffect(() => {
    fetchJobs();
    synthRef.current = typeof window !== 'undefined' ? window.speechSynthesis : null;
    
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/nextapi/jobs');
      const data = await res.json();
      setJobs(data.jobs?.filter(j => j.is_active) || []);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Text-to-Speech for job description (Zero-Reading feature)
  const playJobDescription = (job) => {
    if (!synthRef.current) {
      alert('Speech synthesis not supported in this browser');
      return;
    }

    // Cancel any ongoing speech
    synthRef.current.cancel();

    if (speakingJobId === job._id) {
      setSpeakingJobId(null);
      return;
    }

    // Build speech text
    const salaryText = job.salary?.display || 'Salary negotiable';
    const perksText = job.perks?.length > 0 
      ? `Benefits include: ${job.perks.map(p => PERKS_LABELS[p]?.label || p).join(', ')}.`
      : '';
    const trainingText = job.training_provided ? 'Training will be provided.' : '';
    const expectationsText = job.job_expectations || '';

    const fullText = `
      Job Title: ${job.title}.
      Category: ${job.category}.
      Salary: ${salaryText}.
      Experience required: ${job.required_experience === 0 ? 'Fresher can apply' : `${job.required_experience} years`}.
      ${perksText}
      ${trainingText}
      ${expectationsText ? `Job duties: ${expectationsText}` : ''}
    `.trim();

    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = 'en-IN';
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onstart = () => setSpeakingJobId(job._id);
    utterance.onend = () => setSpeakingJobId(null);
    utterance.onerror = () => setSpeakingJobId(null);

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setSpeakingJobId(null);
    }
  };

  // Get mock commute time
  const getCommuteTime = (index) => {
    return MOCK_COMMUTES[index % MOCK_COMMUTES.length];
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0A0F1C]/95 backdrop-blur-lg border-b border-white/10 px-4 py-4">
        <h1 className="text-xl font-bold">Available Jobs</h1>
        <p className="text-sm text-[#8B95A5]">
          Tap 🔊 to listen to job details
        </p>
      </header>

      {/* Jobs List */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-[#0052CC] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#8B95A5]">Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[#151B2D] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B95A5" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            <p className="text-[#8B95A5]">No jobs available right now</p>
            <p className="text-sm text-[#8B95A5]">Check back soon!</p>
          </div>
        ) : (
          jobs.map((job, index) => (
            <JobCard 
              key={job._id} 
              job={job} 
              commuteTime={getCommuteTime(index)}
              isSpeaking={speakingJobId === job._id}
              onPlayAudio={() => playJobDescription(job)}
              onStopAudio={stopSpeaking}
            />
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function JobCard({ job, commuteTime, isSpeaking, onPlayAudio, onStopAudio }) {
  return (
    <div className="bg-[#151B2D] rounded-2xl p-4 border border-white/5" data-testid="job-card">
      {/* Header with Play Button */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-white" data-testid="job-title">
            {job.title}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="bg-[#0052CC]/20 text-[#0052CC] text-xs px-2 py-1 rounded-full font-medium">
              {job.category}
            </span>
            {job.training_provided && (
              <span className="bg-[#36B37E]/20 text-[#36B37E] text-xs px-2 py-1 rounded-full font-medium">
                Training Provided
              </span>
            )}
          </div>
        </div>
        
        {/* Audio Play Button - Zero Reading Feature */}
        <button
          onClick={isSpeaking ? onStopAudio : onPlayAudio}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isSpeaking 
              ? 'bg-red-500 animate-pulse' 
              : 'bg-[#0052CC] hover:bg-[#003d99]'
          }`}
          data-testid="play-audio-btn"
          title={isSpeaking ? 'Stop' : 'Listen to job details'}
        >
          {isSpeaking ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
          )}
        </button>
      </div>

      {/* Salary */}
      {job.salary?.display && (
        <div className="bg-[#36B37E]/10 border border-[#36B37E]/30 rounded-xl px-4 py-3 mb-3">
          <p className="text-[#36B37E] font-bold text-lg" data-testid="job-salary">
            {job.salary.display}
          </p>
          <p className="text-[#8B95A5] text-xs">
            {job.required_experience === 0 ? 'Fresher OK' : `${job.required_experience}+ years experience`}
          </p>
        </div>
      )}

      {/* Commute Tag - Hyperlocal Feature */}
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-[#0052CC]/10 text-[#0052CC] text-sm px-3 py-1.5 rounded-lg font-medium" data-testid="commute-tag">
          {commuteTime}
        </span>
        {job.employer_location && (
          <span className="text-[#8B95A5] text-xs">
            📍 {job.employer_location}
          </span>
        )}
      </div>

      {/* Perks */}
      {job.perks?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {job.perks.map(perkId => {
            const perk = PERKS_LABELS[perkId];
            return perk ? (
              <span key={perkId} className="bg-[#151B2D] border border-white/10 text-[#8B95A5] text-xs px-2 py-1 rounded-lg flex items-center gap-1">
                <span>{perk.icon}</span>
                <span>{perk.label}</span>
              </span>
            ) : null;
          })}
        </div>
      )}

      {/* Job Expectations Preview */}
      {job.job_expectations && (
        <div className="bg-[#0A0F1C]/50 rounded-xl p-3 mb-3">
          <p className="text-[#8B95A5] text-xs mb-1 font-medium">What you'll do:</p>
          <p className="text-white text-sm line-clamp-2" data-testid="job-expectations">
            {job.job_expectations}
          </p>
        </div>
      )}

      {/* Apply Button */}
      <button 
        className="w-full bg-gradient-to-r from-[#0052CC] to-[#36B37E] text-white font-semibold py-3 rounded-xl transition-all hover:opacity-90"
        data-testid="apply-btn"
      >
        Apply Now
      </button>
    </div>
  );
}
