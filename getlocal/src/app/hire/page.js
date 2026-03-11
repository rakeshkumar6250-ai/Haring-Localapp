'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { calculateDistance, maskPhone, formatDistance, calculateMatchScore } from '@/lib/utils';

export default function HirePage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [activeJob, setActiveJob] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [distanceFilter, setDistanceFilter] = useState(20);
  const [userLocation, setUserLocation] = useState(null);
  const [unlockedIds, setUnlockedIds] = useState([]);
  const [unlockedPhones, setUnlockedPhones] = useState({});
  const [credits, setCredits] = useState(0);
  const [unlocking, setUnlocking] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [reportingNoShow, setReportingNoShow] = useState(null);
  const [trustScores, setTrustScores] = useState({});
  // KYC filter state
  const [eduFilter, setEduFilter] = useState('All');
  const [engFilter, setEngFilter] = useState('All');
  const [expFilter, setExpFilter] = useState('All');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  // Payment state
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [selectedPack, setSelectedPack] = useState(10);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [pendingUnlockId, setPendingUnlockId] = useState(null);

  // Employer ID from localStorage
  const [employerId, setEmployerId] = useState('default-employer');

  useEffect(() => {
    const eid = localStorage.getItem('employer_id') || 'default-employer';
    setEmployerId(eid);
  }, []);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: 28.6139, lng: 77.2090 })
      );
    }
  }, []);

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/nextapi/jobs');
      const data = await res.json();
      const activeJobs = (data.jobs || []).filter(j => j.is_active);
      setJobs(activeJobs);
      
      // Auto-select most recent active job only on first load (when activeJob is undefined)
      if (activeJobs.length > 0 && activeJob === undefined) {
        const latest = activeJobs[0];
        setActiveJob(latest);
        setRoleFilter(latest.category || '');
        setDistanceFilter(latest.location_radius || 20);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    }
  }, [activeJob]);

  // Fetch candidates with auto-refresh
  const fetchCandidates = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (eduFilter !== 'All') params.set('education', eduFilter);
      if (engFilter !== 'All') params.set('english', engFilter);
      if (expFilter !== 'All') params.set('experience', expFilter);
      if (verifiedOnly) params.set('verified', 'true');
      const qs = params.toString();
      const res = await fetch(`/nextapi/candidates${qs ? '?' + qs : ''}`);
      const data = await res.json();
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
  }, [eduFilter, engFilter, expFilter, verifiedOnly]);

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch(`/nextapi/wallet?employer_id=${employerId}`);
      const data = await res.json();
      setCredits(data.balance ?? 0);
      setUnlockedIds(data.unlockedCandidates || []);
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
    }
  }, [employerId]);

  useEffect(() => {
    fetchJobs();
    fetchCandidates();
    fetchCredits();
    const interval = setInterval(fetchCandidates, 10000);
    return () => clearInterval(interval);
  }, [fetchJobs, fetchCandidates, fetchCredits]);

  // Handle job selection
  const handleJobSelect = (job) => {
    setActiveJob(job);
    setRoleFilter(job.category || '');
    setDistanceFilter(job.location_radius || 20);
  };

  // Handle show all (reset filters)
  const handleShowAll = () => {
    setActiveJob(null);
    setRoleFilter('');
    setDistanceFilter(20);
  };

  // Handle unlock - check credits first
  const handleUnlock = async (candidateId) => {
    if (credits < 1) {
      setPendingUnlockId(candidateId);
      setShowBuyCredits(true);
      return;
    }

    setUnlocking(candidateId);
    try {
      const res = await fetch('/nextapi/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, employer_id: employerId }),
      });

      const data = await res.json();
      if (res.status === 402) {
        setPendingUnlockId(candidateId);
        setShowBuyCredits(true);
        return;
      }
      if (res.ok) {
        setCredits(data.newBalance);
        setUnlockedIds(prev => [...prev, candidateId]);
        if (data.phone) {
          setUnlockedPhones(prev => ({ ...prev, [candidateId]: data.phone }));
        }
      }
    } catch (err) {
      console.error('Unlock error:', err);
    } finally {
      setUnlocking(null);
    }
  };

  // Load Razorpay script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) { resolve(true); return; }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Buy credits with Razorpay
  const handleBuyCredits = async () => {
    setPaymentLoading(true);
    try {
      const orderRes = await fetch('/nextapi/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits: selectedPack, employer_id: employerId }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error);

      // Mock mode: add credits directly
      if (orderData.mock) {
        const verifyRes = await fetch('/nextapi/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employer_id: employerId, credits: selectedPack, mock: true }),
        });
        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          setCredits(verifyData.new_balance);
          setShowBuyCredits(false);
          if (pendingUnlockId) {
            setTimeout(() => handleUnlock(pendingUnlockId), 300);
            setPendingUnlockId(null);
          }
        }
        return;
      }

      // Real Razorpay checkout
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Failed to load Razorpay');

      const options = {
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'GetLocal',
        description: `${selectedPack} Hiring Credits`,
        order_id: orderData.order.id,
        handler: async function (response) {
          const verifyRes = await fetch('/nextapi/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              employer_id: employerId,
              credits: selectedPack,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            setCredits(verifyData.new_balance);
            setShowBuyCredits(false);
            if (pendingUnlockId) {
              setTimeout(() => handleUnlock(pendingUnlockId), 300);
              setPendingUnlockId(null);
            }
          }
        },
        theme: { color: '#0052CC' },
        modal: { ondismiss: () => setPaymentLoading(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Payment error:', err);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Trigger AI processing for a candidate
  const handleProcessAudio = async (candidateId) => {
    setProcessing(candidateId);
    try {
      const res = await fetch('/nextapi/process-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId }),
      });

      const data = await res.json();
      if (res.ok) {
        await fetchCandidates();
        alert(`Profile processed! Name: ${data.extracted?.name || 'Unknown'}`);
      } else {
        alert(data.error || 'Processing failed');
      }
    } catch (err) {
      console.error('Process error:', err);
      alert('Processing failed: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  // Report No-Show - Anti-Ghosting Feature
  const handleReportNoShow = async (candidateId) => {
    if (!confirm('Are you sure you want to report this candidate as a no-show? This will affect their trust score.')) {
      return;
    }
    
    setReportingNoShow(candidateId);
    try {
      const res = await fetch('/nextapi/report-noshow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, reason: 'No-show for scheduled interview' }),
      });

      const data = await res.json();
      if (res.ok) {
        // Update local trust score
        setTrustScores(prev => ({ ...prev, [candidateId]: data.newScore }));
        alert(`Reported. Trust score updated: ${data.previousScore} → ${data.newScore}`);
        await fetchCandidates();
      } else {
        alert(data.error || 'Failed to report');
      }
    } catch (err) {
      console.error('Report error:', err);
    } finally {
      setReportingNoShow(null);
    }
  };

  // Generate WhatsApp invite link
  const getWhatsAppLink = (phone, candidateName) => {
    const jobTitle = activeJob?.title || 'a position';
    const location = activeJob?.employer_location || 'our office';
    const message = `Hello ${candidateName}, I saw your profile on GetLocal. I am hiring for ${jobTitle}. Can you come for an interview? Location: ${location}`;
    const cleanPhone = phone?.replace(/\s/g, '').replace('+', '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  // Filter candidates based on active job or manual filters
  const jobExpRequirement = activeJob?.required_experience || 3;
  
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
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/post-job')}
              className="bg-[#0052CC] hover:bg-[#003d99] text-white px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1 transition-all"
              data-testid="post-job-btn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Post Job
            </button>
            <button onClick={() => setShowBuyCredits(true)} className="bg-[#36B37E]/20 text-[#36B37E] px-3 py-1.5 rounded-full text-sm font-medium hover:bg-[#36B37E]/30 transition-all" data-testid="credit-balance">
              {credits} Credits {credits === 0 && <span className="text-[10px] opacity-80">+ Buy</span>}
            </button>
          </div>
        </div>

        {/* Active Jobs Selector */}
        {jobs.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-[#8B95A5] mb-2">Your Active Jobs:</p>
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {jobs.map((job) => (
                <button
                  key={job._id}
                  onClick={() => handleJobSelect(job)}
                  className={`flex-shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeJob?._id === job._id
                      ? 'bg-[#0052CC] text-white'
                      : 'bg-[#151B2D] text-[#8B95A5] hover:bg-[#1E2740]'
                  }`}
                  data-testid={`job-filter-${job._id}`}
                >
                  {job.title.length > 20 ? job.title.slice(0, 20) + '...' : job.title}
                </button>
              ))}
              <button
                onClick={handleShowAll}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  !activeJob
                    ? 'bg-[#36B37E] text-white'
                    : 'bg-[#151B2D] text-[#8B95A5] hover:bg-[#1E2740]'
                }`}
                data-testid="show-all-btn"
              >
                Show All
              </button>
            </div>
          </div>
        )}

        {/* Active Job Info Banner */}
        {activeJob && (
          <div className="bg-[#0052CC]/10 border border-[#0052CC]/30 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#0052CC] text-xs font-medium">Filtering for:</p>
                <p className="text-white font-semibold">{activeJob.title}</p>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="bg-[#0052CC]/30 text-[#0052CC] px-2 py-1 rounded-full">
                  {activeJob.category}
                </span>
                <span className="bg-[#36B37E]/20 text-[#36B37E] px-2 py-1 rounded-full">
                  {activeJob.required_experience}+ yrs
                </span>
                <span className="bg-[#8B95A5]/20 text-[#8B95A5] px-2 py-1 rounded-full">
                  {activeJob.location_radius} km
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <input
          type="text"
          placeholder="Search by role (Driver, Helper, Cook...)"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-4 py-3 text-sm mb-4"
          data-testid="role-search"
        />

        <div className="flex items-center gap-4">
          <span className="text-sm text-[#8B95A5]">Distance:</span>
          <input
            type="range"
            min="1"
            max="50"
            value={distanceFilter}
            onChange={(e) => setDistanceFilter(Number(e.target.value))}
            className="flex-1 accent-[#0052CC]"
            data-testid="distance-slider"
          />
          <span className="text-sm font-medium min-w-[50px]">{distanceFilter} km</span>
        </div>

        {/* Candidate Filter Bar */}
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <select value={eduFilter} onChange={(e) => setEduFilter(e.target.value)} className="bg-[#151B2D] border border-white/10 rounded-lg px-3 py-2 text-sm text-white" data-testid="filter-education">
            <option value="All">Education</option>
            {['10th Or Below', '12th Pass', 'Diploma', 'ITI', 'Graduate', 'Post Graduate'].map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={engFilter} onChange={(e) => setEngFilter(e.target.value)} className="bg-[#151B2D] border border-white/10 rounded-lg px-3 py-2 text-sm text-white" data-testid="filter-english">
            <option value="All">English</option>
            {['No English', 'Basic English', 'Good English'].map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={expFilter} onChange={(e) => setExpFilter(e.target.value)} className="bg-[#151B2D] border border-white/10 rounded-lg px-3 py-2 text-sm text-white" data-testid="filter-experience">
            <option value="All">Experience</option>
            {['Fresher', 'Experienced'].map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <button
            onClick={() => setVerifiedOnly(!verifiedOnly)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              verifiedOnly ? 'bg-[#36B37E] text-white' : 'bg-[#151B2D] text-[#8B95A5] border border-white/10'
            }`}
            data-testid="filter-verified"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
            Verified Only
          </button>
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
            <div className="w-16 h-16 bg-[#151B2D] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B95A5" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <p className="text-[#8B95A5] mb-2">No candidates found</p>
            <p className="text-sm text-[#8B95A5] mb-4">Try adjusting the filters or distance</p>
            {jobs.length === 0 && (
              <button
                onClick={() => router.push('/post-job')}
                className="bg-[#0052CC] text-white px-4 py-2 rounded-xl text-sm font-medium"
              >
                Post Your First Job
              </button>
            )}
          </div>
        ) : (
          filteredCandidates.map((candidate) => {
            const isUnlocked = unlockedIds.includes(candidate._id);
            const isNew = candidate.created_at && 
              (new Date() - new Date(candidate.created_at)) < 60000;
            const isProcessed = candidate.moltbot_processed;
            const matchScore = calculateMatchScore(candidate.experience_years, jobExpRequirement);
            const revealedPhone = unlockedPhones[candidate._id] || candidate.phone;
            
            const trustScore = trustScores[candidate._id] ?? candidate.trust_score ?? 100;
            
            return (
              <CandidateCard
                key={candidate._id}
                candidate={candidate}
                isUnlocked={isUnlocked}
                isNew={isNew}
                isProcessed={isProcessed}
                matchScore={matchScore}
                trustScore={trustScore}
                revealedPhone={revealedPhone}
                whatsappLink={getWhatsAppLink(revealedPhone, candidate.name)}
                onUnlock={() => handleUnlock(candidate._id)}
                onProcess={() => handleProcessAudio(candidate._id)}
                onReportNoShow={() => handleReportNoShow(candidate._id)}
                unlocking={unlocking === candidate._id}
                processing={processing === candidate._id}
                reportingNoShow={reportingNoShow === candidate._id}
              />
            );
          })
        )}
      </div>

      {/* Buy Credits Modal */}
      {showBuyCredits && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" data-testid="buy-credits-modal">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowBuyCredits(false); setPendingUnlockId(null); }} />
          <div className="relative bg-[#151B2D] rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 border border-white/10 z-10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-white">Buy Credits</h3>
              <button onClick={() => { setShowBuyCredits(false); setPendingUnlockId(null); }} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center" data-testid="close-buy-credits">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <p className="text-[#8B95A5] text-sm mb-4">
              You need credits to unlock candidate profiles. Each unlock costs <span className="text-white font-medium">1 credit</span>.
            </p>

            <div className="space-y-2 mb-5">
              {[
                { credits: 10, price: 500, tag: '' },
                { credits: 25, price: 1000, tag: 'Popular' },
                { credits: 50, price: 1750, tag: 'Best Value' },
              ].map(pack => (
                <button
                  key={pack.credits}
                  onClick={() => setSelectedPack(pack.credits)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-all border ${
                    selectedPack === pack.credits
                      ? 'bg-[#0052CC]/20 border-[#0052CC]'
                      : 'bg-[#0A0F1C] border-white/10 hover:border-white/20'
                  }`}
                  data-testid={`pack-${pack.credits}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      selectedPack === pack.credits ? 'bg-[#0052CC] text-white' : 'bg-white/10 text-[#8B95A5]'
                    }`}>
                      {pack.credits}
                    </div>
                    <div className="text-left">
                      <p className="text-white font-medium">{pack.credits} Credits</p>
                      <p className="text-[#8B95A5] text-xs">{pack.credits} profile unlocks</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">&#8377;{pack.price}</p>
                    {pack.tag && <span className="text-[#36B37E] text-xs font-medium">{pack.tag}</span>}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleBuyCredits}
              disabled={paymentLoading}
              className="w-full bg-gradient-to-r from-[#0052CC] to-[#36B37E] hover:opacity-90 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
              data-testid="confirm-buy-btn"
            >
              {paymentLoading ? (
                <><svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20"/></svg>Processing...</>
              ) : (
                <>Pay &#8377;{selectedPack === 10 ? '500' : selectedPack === 25 ? '1,000' : '1,750'} &rarr; Get {selectedPack} Credits</>
              )}
            </button>

            <p className="text-[#8B95A5] text-xs text-center mt-3">
              Secured by Razorpay. You&apos;ll be redirected to the payment gateway.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function CandidateCard({ candidate, isUnlocked, isNew, isProcessed, matchScore, trustScore, revealedPhone, whatsappLink, onUnlock, onProcess, onReportNoShow, unlocking, processing, reportingNoShow }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Trust Score color
  const getTrustScoreColor = (score) => {
    if (score >= 90) return 'bg-[#36B37E]/20 text-[#36B37E]';
    if (score >= 70) return 'bg-amber-500/20 text-amber-400';
    return 'bg-red-500/20 text-red-400';
  };

  const togglePlay = () => {
    if (!candidate.audio_interview_url) return;
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Format language display
  const getLanguageLabel = (code) => {
    const labels = { 'hi': 'हिंदी', 'te': 'తెలుగు', 'en': 'English' };
    return labels[code] || 'English';
  };

  return (
    <div className={`candidate-card bg-[#151B2D] rounded-2xl p-4 border transition-all ${
      isNew ? 'border-[#36B37E] ring-2 ring-[#36B37E]/20' : 'border-white/5'
    }`} data-testid="candidate-card">
      {/* Badges Row */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-2 flex-wrap">
          {isNew && (
            <span className="bg-[#36B37E] text-white text-xs px-2 py-1 rounded-full font-medium animate-pulse">
              NEW
            </span>
          )}
          {isProcessed && (
            <span className="bg-[#0052CC] text-white text-xs px-2 py-1 rounded-full font-medium">
              AI Processed
            </span>
          )}
          {candidate.verification_status === 'Verified' && (
            <span className="bg-[#36B37E]/20 text-[#36B37E] text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1" data-testid="verified-identity-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              Verified Identity
            </span>
          )}
          {!isProcessed && candidate.audio_interview_url && (
            <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded-full font-medium animate-pulse">
              ⏳ Processing...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Trust Score Badge */}
          {trustScore !== undefined && (
            <div 
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${getTrustScoreColor(trustScore)}`}
              data-testid="trust-score"
              title="Trust Score"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              {trustScore}%
            </div>
          )}
          {/* Smart Match Score */}
          {isProcessed && matchScore > 0 && (
            <div 
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                matchScore >= 85 ? 'bg-[#36B37E]/20 text-[#36B37E]' : 
                matchScore >= 70 ? 'bg-amber-500/20 text-amber-400' : 
                'bg-red-500/20 text-red-400'
              }`}
              data-testid="match-score"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
              {matchScore}% Match
            </div>
          )}
          <div className="flex items-center gap-1 text-[#36B37E] text-sm font-medium" data-testid="candidate-distance">
            <span>📍</span>
            <span>{formatDistance(candidate.distance)}</span>
          </div>
        </div>
      </div>

      {/* Header with Name prominently displayed */}
      <div className="mb-4">
        <h3 className="font-bold text-xl text-white" data-testid="candidate-name">
          {candidate.name || 'Candidate'}
        </h3>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-[#8B95A5] text-sm">{candidate.role_category || 'General Worker'}</span>
          {candidate.experience_years > 0 && (
            <span className="bg-[#0052CC]/20 text-[#0052CC] text-xs px-2 py-1 rounded-full font-medium">
              {candidate.experience_years} yrs exp
            </span>
          )}
          {candidate.lang_code && (
            <span className="bg-[#8B95A5]/10 text-[#8B95A5] text-xs px-2 py-1 rounded-full">
              🗣 {getLanguageLabel(candidate.lang_code)}
            </span>
          )}
          {/* Relocation Badge */}
          {candidate.will_relocate !== undefined && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              candidate.will_relocate 
                ? 'bg-[#36B37E]/20 text-[#36B37E]' 
                : 'bg-[#8B95A5]/10 text-[#8B95A5]'
            }`} data-testid="relocation-badge">
              {candidate.will_relocate ? '✓ Will Relocate' : '✗ Won\'t Relocate'}
            </span>
          )}
        </div>
        {/* Address */}
        {candidate.address && (
          <p className="text-[#8B95A5] text-sm mt-2 flex items-center gap-1" data-testid="candidate-address">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {candidate.address}
          </p>
        )}
        {/* Education / English / Experience tags */}
        {(candidate.education_level || candidate.english_level || candidate.experience_type) && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {candidate.education_level && (
              <span className="bg-[#151B2D] border border-white/10 text-[#8B95A5] text-xs px-2 py-1 rounded-lg" data-testid="candidate-education">{candidate.education_level}</span>
            )}
            {candidate.english_level && (
              <span className="bg-[#151B2D] border border-white/10 text-[#8B95A5] text-xs px-2 py-1 rounded-lg" data-testid="candidate-english">{candidate.english_level}</span>
            )}
            {candidate.experience_type && (
              <span className="bg-[#151B2D] border border-white/10 text-[#8B95A5] text-xs px-2 py-1 rounded-lg" data-testid="candidate-experience-type">{candidate.experience_type}</span>
            )}
          </div>
        )}
      </div>

      {/* AI Summary - Now shown prominently when processed */}
      {isProcessed && candidate.professional_summary && (
        <div className="bg-gradient-to-br from-[#0052CC]/15 to-[#36B37E]/10 border border-[#0052CC]/30 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2">
              <path d="M12 2L2 7v10l10 5 10-5V7l-10-5z"/>
              <path d="M12 22V12"/>
              <path d="M2 7l10 5 10-5"/>
            </svg>
            <span className="text-[#0052CC] text-sm font-semibold">AI Profile Summary</span>
          </div>
          <p className="text-white/90 text-sm leading-relaxed" data-testid="candidate-summary">
            {candidate.professional_summary}
          </p>
        </div>
      )}

      {/* Audio Player / Process Button */}
      {candidate.audio_interview_url && (
        <div className="mb-4">
          {!isProcessed ? (
            // Show audio player with process button
            <div className="space-y-3">
              <div className="audio-player rounded-xl p-4">
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
              
              {/* Process with AI button */}
              <button
                onClick={onProcess}
                disabled={processing}
                className="w-full bg-gradient-to-r from-[#0052CC] to-[#36B37E] hover:opacity-90 disabled:opacity-50 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                data-testid="process-ai-btn"
              >
                {processing ? (
                  <>
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
                    </svg>
                    Processing with AI...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
                      <path d="M12 16v-4"/>
                      <path d="M12 8h.01"/>
                    </svg>
                    Process with AI (Extract Profile)
                  </>
                )}
              </button>
            </div>
          ) : (
            // Processed: Show compact audio + View Profile option
            <div className="space-y-3">
              {/* Compact audio player */}
              <div className="flex items-center gap-3 bg-[#0A0F1C]/50 rounded-xl p-3">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 bg-[#0052CC]/30 hover:bg-[#0052CC]/50 rounded-full flex items-center justify-center transition-all"
                  data-testid="play-audio-btn-compact"
                >
                  {isPlaying ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#0052CC">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#0052CC">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  )}
                </button>
                <span className="text-sm text-[#8B95A5]">Listen to voice interview</span>
                <audio
                  ref={audioRef}
                  src={candidate.audio_interview_url}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
              </div>
              
              {/* View Full Transcript toggle */}
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="w-full bg-[#151B2D] border border-[#0052CC]/50 text-[#0052CC] font-medium py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#0052CC]/10 transition-all"
                data-testid="view-profile-btn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                {showProfile ? 'Hide Transcript' : 'View Full Transcript'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Expanded Profile Details */}
      {showProfile && isProcessed && candidate.transcription && (
        <div className="bg-[#0A0F1C] rounded-xl p-4 mb-4 border border-white/10">
          <h4 className="text-sm font-medium text-[#8B95A5] mb-2">Interview Transcript</h4>
          <p className="text-white/80 text-sm leading-relaxed">
            {candidate.transcription}
          </p>
        </div>
      )}

      {/* Contact Section */}
      <div className="bg-[#0A0F1C]/50 rounded-xl p-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[#8B95A5] text-xs mb-1">Contact Number</p>
            <p className={`font-mono text-lg ${isUnlocked ? 'text-[#36B37E]' : 'text-white/60'}`} data-testid="candidate-phone">
              {isUnlocked ? revealedPhone : maskPhone(candidate.phone)}
            </p>
            {!isUnlocked && (
              <p className="text-xs text-[#8B95A5] mt-1">Unlock to reveal full number</p>
            )}
          </div>
          
          {!isUnlocked && (
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
                  Unlock (1 Credit)
                </>
              )}
            </button>
          )}
        </div>
        
        {/* Unlocked: Action buttons */}
        {isUnlocked && (
          <div className="flex gap-2">
            {/* Call Button */}
            <a
              href={`tel:${revealedPhone?.replace(/\s/g, '')}`}
              className="flex-1 bg-[#36B37E] hover:bg-[#2d9a6a] text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
              data-testid="call-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              Call
            </a>
            
            {/* WhatsApp Invite Button */}
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-[#25D366] hover:bg-[#1da851] text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
              data-testid="whatsapp-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
          </div>
        )}
        
        {/* Report No-Show Button (only for unlocked profiles) */}
        {isUnlocked && (
          <button
            onClick={onReportNoShow}
            disabled={reportingNoShow}
            className="w-full mt-3 bg-transparent border border-red-500/30 text-red-400 font-medium py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-red-500/10 transition-all text-sm"
            data-testid="report-noshow-btn"
          >
            {reportingNoShow ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
                </svg>
                Reporting...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                Report No-Show
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