'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { calculateDistance, maskPhone, formatDistance } from '@/lib/utils';

export default function HirePage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [distanceFilter, setDistanceFilter] = useState(20);
  const [userLocation, setUserLocation] = useState(null);
  const [unlockedIds, setUnlockedIds] = useState([]);
  const [credits, setCredits] = useState(100);
  const [unlocking, setUnlocking] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: 28.6139, lng: 77.2090 })
      );
    }
  }, []);

  // Fetch candidates with auto-refresh
  const fetchCandidates = useCallback(async () => {
    try {
      const res = await fetch('/nextapi/candidates');
      const data = await res.json();
      // Sort by created_at descending to show newest first
      const sorted = (data.candidates || []).sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      setCandidates(sorted);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch('/nextapi/wallet');
      const data = await res.json();
      setCredits(data.balance || 100);
      setUnlockedIds(data.unlockedCandidates || []);
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
    fetchCredits();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchCandidates, 10000);
    return () => clearInterval(interval);
  }, [fetchCandidates, fetchCredits]);

  const handleUnlock = async (candidateId) => {
    if (credits < 10) {
      alert('Not enough credits! You need 10 credits to unlock a profile.');
      return;
    }

    setUnlocking(candidateId);
    try {
      const res = await fetch('/nextapi/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId }),
      });

      const data = await res.json();
      if (res.ok) {
        setCredits(data.newBalance);
        setUnlockedIds(prev => [...prev, candidateId]);
      } else {
        alert(data.error || 'Failed to unlock');
      }
    } catch (err) {
      console.error('Unlock error:', err);
    } finally {
      setUnlocking(null);
    }
  };

  // Filter candidates
  const filteredCandidates = candidates
    .map(c => {
      if (!userLocation || !c.location) return { ...c, distance: 999 };
      const dist = calculateDistance(
        userLocation.lat, userLocation.lng,
        c.location.lat, c.location.lng
      );
      return { ...c, distance: dist };
    })
    .filter(c => c.distance <= distanceFilter)
    .filter(c => !roleFilter || c.role_category?.toLowerCase().includes(roleFilter.toLowerCase()))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Newest first

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0A0F1C]/95 backdrop-blur-lg border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Find Candidates</h1>
            {lastRefresh && (
              <p className="text-xs text-[#8B95A5]">
                Updated {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="bg-[#36B37E]/20 text-[#36B37E] px-3 py-1 rounded-full text-sm font-medium" data-testid="credit-balance">
            💰 {credits} credits
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by role (Driver, Helper, Cook...)"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-4 py-3 text-sm mb-4"
          data-testid="role-search"
        />

        {/* Distance Slider */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#8B95A5]">Distance:</span>
          <input
            type="range"
            min="1"
            max="20"
            value={distanceFilter}
            onChange={(e) => setDistanceFilter(Number(e.target.value))}
            className="flex-1 accent-[#0052CC]"
            data-testid="distance-slider"
          />
          <span className="text-sm font-medium min-w-[50px]">{distanceFilter} km</span>
        </div>
      </header>

      {/* Candidates List */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-[#0052CC] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#8B95A5]">Loading candidates...</p>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#8B95A5] mb-2">No candidates found</p>
            <p className="text-sm text-[#8B95A5]">Try increasing the distance or changing the role filter</p>
          </div>
        ) : (
          filteredCandidates.map((candidate) => {
            const isUnlocked = unlockedIds.includes(candidate._id);
            const isNew = candidate.created_at && 
              (new Date() - new Date(candidate.created_at)) < 60000; // Less than 1 minute old
            
            return (
              <CandidateCard
                key={candidate._id}
                candidate={candidate}
                isUnlocked={isUnlocked}
                isNew={isNew}
                onUnlock={() => handleUnlock(candidate._id)}
                unlocking={unlocking === candidate._id}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function CandidateCard({ candidate, isUnlocked, isNew, onUnlock, unlocking }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (!candidate.audio_interview_url) return;
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className={`candidate-card bg-[#151B2D] rounded-2xl p-4 border transition-all ${
      isNew ? 'border-[#36B37E] ring-2 ring-[#36B37E]/20' : 'border-white/5'
    }`} data-testid="candidate-card">
      {/* New Badge */}
      {isNew && (
        <div className="flex justify-end mb-2">
          <span className="bg-[#36B37E] text-white text-xs px-2 py-1 rounded-full font-medium animate-pulse">
            NEW
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-lg" data-testid="candidate-name">{candidate.name || 'Candidate'}</h3>
          <p className="text-[#8B95A5] text-sm">{candidate.role_category || 'General Worker'}</p>
          {candidate.lang_code && (
            <span className="text-xs text-[#0052CC]">
              🗣 {candidate.lang_code === 'hi' ? 'Hindi' : candidate.lang_code === 'te' ? 'Telugu' : 'English'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[#36B37E] text-sm font-medium" data-testid="candidate-distance">
          <span>📍</span>
          <span>{formatDistance(candidate.distance)}</span>
        </div>
      </div>

      {/* Audio Player */}
      {candidate.audio_interview_url && (
        <div className="audio-player rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all active:scale-95"
              data-testid="play-audio-btn"
            >
              {isPlaying ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            </button>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">Listen to Fluency</p>
              <p className="text-white/60 text-xs">Voice interview recording</p>
            </div>
          </div>
          <audio
            ref={audioRef}
            src={candidate.audio_interview_url}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        </div>
      )}

      {/* Contact Section */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#8B95A5] text-sm">Phone</p>
          <p className="font-mono text-lg" data-testid="candidate-phone">
            {isUnlocked ? candidate.phone : maskPhone(candidate.phone)}
          </p>
        </div>
        
        {isUnlocked ? (
          <a
            href={`tel:${candidate.phone}`}
            className="bg-[#36B37E] hover:bg-[#2d9a6a] text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition-all active:scale-95"
            data-testid="call-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            Call Now
          </a>
        ) : (
          <button
            onClick={onUnlock}
            disabled={unlocking}
            className="bg-[#0052CC] hover:bg-[#003d99] disabled:bg-gray-600 text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition-all active:scale-95"
            data-testid="unlock-btn"
          >
            {unlocking ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
                </svg>
                Unlocking...
              </span>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Unlock (10 💰)
              </>
            )}
          </button>
        )}
      </div>

      {/* Verified Badge */}
      {candidate.is_verified && (
        <div className="mt-3 flex items-center gap-1 text-[#36B37E] text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z" />
          </svg>
          Verified Candidate
        </div>
      )}
    </div>
  );
}