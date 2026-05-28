'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { VoiceIntroPlayer } from '@/components/VoiceIntroPlayer';
import { calculateDetailedMatchScore } from '@/lib/matchScore';

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

function locationLabel(loc) {
  if (!loc) return null;
  if (typeof loc === 'string') return loc;
  return loc.label || null;
}

function scoreColor(score) {
  if (score >= 85) return 'bg-[#36B37E]/15 text-[#36B37E]';
  if (score >= 70) return 'bg-amber-500/15 text-amber-400';
  return 'bg-red-500/15 text-red-400';
}

export default function CandidatesPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [balance, setBalance] = useState(0);
  const [unlocked, setUnlocked] = useState([]);
  const [revealed, setRevealed] = useState({}); // candidateId -> phone
  const [loading, setLoading] = useState(true);
  const [unlockingId, setUnlockingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [roleFilter, setRoleFilter] = useState('All');
  const [voiceOnly, setVoiceOnly] = useState(false);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadWallet = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/nextapi/wallet', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance || 0);
        setUnlocked(data.unlockedCandidates || []);
      }
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    if (authLoading || !user) return;
    const load = async () => {
      setLoading(true);
      try {
        const [cRes, jRes] = await Promise.all([
          fetch('/nextapi/candidates'),
          fetch('/nextapi/jobs'),
        ]);
        const cData = await cRes.json();
        const jData = await jRes.json();
        setCandidates(cData.candidates || []);
        setMyJobs((jData.jobs || []).filter((j) => j.employer_id && j.employer_id === user.id));
      } catch {
        showToast('Failed to load candidates. Please refresh.', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
    loadWallet();
  }, [authLoading, user, loadWallet]);

  const handleUnlock = async (candidate) => {
    if (unlocked.includes(candidate._id) || revealed[candidate._id]) return;
    setUnlockingId(candidate._id);
    try {
      const res = await fetch('/nextapi/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ candidateId: candidate._id }),
      });
      const data = await res.json();
      if (res.status === 402) {
        showToast('Not enough credits — taking you to checkout…', 'error');
        setTimeout(() => router.push('/pricing'), 1200);
        return;
      }
      if (!res.ok) {
        showToast(data.error || 'Failed to unlock candidate.', 'error');
        return;
      }
      setRevealed((prev) => ({ ...prev, [candidate._id]: data.phone }));
      setUnlocked((prev) => [...new Set([...prev, candidate._id])]);
      if (typeof data.newBalance === 'number') setBalance(data.newBalance);
      showToast('Contact unlocked!', 'success');
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setUnlockingId(null);
    }
  };

  const selectedJob = myJobs.find((j) => j._id === selectedJobId);

  const categories = useMemo(() => {
    const set = new Set();
    candidates.forEach((c) => {
      const role = c.role_category || c.category;
      if (role) set.add(role);
    });
    return ['All', ...Array.from(set).sort()];
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (voiceOnly && !c.audio_interview_url) return false;
      if (roleFilter !== 'All' && (c.role_category || c.category) !== roleFilter) return false;
      return true;
    });
  }, [candidates, voiceOnly, roleFilter]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0052CC] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" data-testid="candidates-page">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0A0F1C]/95 backdrop-blur-lg border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white" data-testid="candidates-title">Browse Talent</h1>
            <p className="text-sm text-[#8B95A5]">{filteredCandidates.length} of {candidates.length} candidates</p>
          </div>
          <a
            href="/pricing"
            className="flex items-center gap-2 bg-gradient-to-r from-[#D4A017] to-[#F5C518] text-[#0A0F1C] font-bold text-sm px-3.5 py-2 rounded-xl transition-all active:scale-95"
            data-testid="credits-badge"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9" /><text x="12" y="16" textAnchor="middle" fontSize="11" fill="#0A0F1C" fontWeight="bold">₹</text></svg>
            {balance} {balance < 3 && <span className="opacity-80">· Buy</span>}
          </a>
        </div>

        {/* Filters: role/category + voice intros only */}
        <div className="mt-3 flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="flex-1 bg-[#151B2D] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#0052CC] appearance-none"
            data-testid="role-filter"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat === 'All' ? 'All Roles' : cat}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setVoiceOnly((v) => !v)}
            aria-pressed={voiceOnly}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all border shrink-0 ${
              voiceOnly
                ? 'bg-[#36B37E] border-[#36B37E] text-white'
                : 'bg-[#151B2D] border-white/10 text-[#8B95A5]'
            }`}
            data-testid="voice-only-toggle"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
            </svg>
            Voice Only
          </button>
        </div>

        {/* Match against my job */}
        {myJobs.length > 0 && (
          <div className="mt-2">
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#0052CC] appearance-none"
              data-testid="match-job-select"
            >
              <option value="">Show match score against my job…</option>
              {myJobs.map((j) => (
                <option key={j._id} value={j._id}>
                  {j.title} {locationLabel(j.location) ? `· ${locationLabel(j.location)}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-[#0052CC] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#8B95A5]">Loading candidates...</p>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="text-center py-16" data-testid="candidates-empty">
            <p className="text-white font-medium text-lg mb-1">No candidates match</p>
            <p className="text-[#8B95A5] text-sm">Try clearing the role filter or the Voice Only toggle.</p>
          </div>
        ) : (
          filteredCandidates.map((c) => {
            const isUnlocked = unlocked.includes(c._id) || !!revealed[c._id];
            const phone = revealed[c._id] || c.phone;
            const loc = locationLabel(c.address || c.location);
            const match = selectedJob ? calculateDetailedMatchScore(selectedJob, c) : null;

            return (
              <div
                key={c._id}
                className="bg-[#151B2D] rounded-2xl p-5 border border-white/5 transition-all hover:border-white/10"
                data-testid="candidate-card"
              >
                {/* Top row */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 shrink-0 rounded-full bg-[#0052CC]/15 text-[#0052CC] font-bold flex items-center justify-center">
                    {initials(c.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-white truncate" data-testid="candidate-name">
                        {c.name || 'Candidate'}
                      </h3>
                      {c.verification_status === 'Verified' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#36B37E]/15 text-[#36B37E] font-semibold flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-[#8B95A5] text-sm mt-0.5">{c.role_category || 'General'}</p>
                  </div>
                  {match && (
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${scoreColor(match.score)}`}
                      data-testid="candidate-match-score"
                    >
                      {match.score}% Match
                    </span>
                  )}
                </div>

                {/* Info chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {loc && (
                    <span className="inline-flex items-center gap-1.5 bg-[#8B95A5]/10 text-[#8B95A5] text-sm px-3 py-1.5 rounded-lg">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                      {loc}
                    </span>
                  )}
                  {(c.salary_expected || c.salary) && (
                    <span className="inline-flex items-center gap-1.5 bg-[#36B37E]/10 text-[#36B37E] text-sm px-3 py-1.5 rounded-lg font-semibold">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                      {typeof (c.salary_expected || c.salary) === 'object'
                        ? (c.salary_expected || c.salary).display
                        : c.salary_expected || `₹${c.salary}`}
                    </span>
                  )}
                  {typeof c.trust_score === 'number' && (
                    <span className="inline-flex items-center gap-1.5 bg-[#0052CC]/10 text-[#0052CC] text-sm px-3 py-1.5 rounded-lg">
                      Trust {c.trust_score}
                    </span>
                  )}
                </div>

                {/* Voice intro (free, ungated) */}
                {c.audio_interview_url ? (
                  <div className="mb-4">
                    <VoiceIntroPlayer src={c.audio_interview_url} candidateId={c._id} />
                  </div>
                ) : null}

                {/* Contact + unlock */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="min-w-0">
                    <p className="text-[10px] text-[#8B95A5] uppercase tracking-wide">Contact</p>
                    {isUnlocked ? (
                      <a
                        href={`tel:${phone}`}
                        className="text-white font-semibold text-sm font-mono"
                        data-testid={`candidate-phone-${c._id}`}
                      >
                        {phone}
                      </a>
                    ) : (
                      <p className="text-[#8B95A5] font-semibold text-sm font-mono select-none" data-testid={`candidate-phone-masked-${c._id}`}>
                        +91 ••••• •••••
                      </p>
                    )}
                  </div>

                  {isUnlocked ? (
                    <span className="text-[#36B37E] text-sm font-semibold flex items-center gap-1.5 shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                      Unlocked
                    </span>
                  ) : (
                    <button
                      onClick={() => handleUnlock(c)}
                      disabled={unlockingId === c._id}
                      className="bg-gradient-to-r from-[#D4A017] to-[#F5C518] text-[#0A0F1C] font-bold text-sm px-4 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2 shrink-0"
                      data-testid={`unlock-btn-${c._id}`}
                    >
                      {unlockingId === c._id ? (
                        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" /></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
                      )}
                      Unlock Contact
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
            toast.type === 'error'
              ? 'bg-red-500/90 text-white'
              : toast.type === 'success'
              ? 'bg-[#36B37E] text-white'
              : 'bg-[#151B2D] text-white border border-white/10'
          }`}
          data-testid="candidates-toast"
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
