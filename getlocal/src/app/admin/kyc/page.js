'use client';

import { useState, useEffect, useCallback } from 'react';

export default function AdminKycPage() {
  const [tab, setTab] = useState('candidates');
  const [employers, setEmployers] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Pending');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [empRes, candRes] = await Promise.all([
        fetch('/nextapi/employers'),
        fetch('/nextapi/candidates'),
      ]);
      const empData = await empRes.json();
      const candData = await candRes.json();
      setEmployers(empData.employers || []);
      // Only show candidates that have ID documents uploaded OR pending status
      setCandidates((candData.candidates || []).filter(c =>
        c.verification_status === 'Pending' || c.verification_status === 'Verified' || c.id_document_url
      ));
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleEmployerAction = async (employerId, action) => {
    setActionLoading(employerId);
    try {
      await fetch('/nextapi/employers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employer_id: employerId, action }),
      });
      fetchData();
    } catch (err) {
      console.error(`Failed to ${action}:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCandidateAction = async (candidateId, action) => {
    setActionLoading(candidateId);
    try {
      await fetch('/nextapi/candidates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidateId, action }),
      });
      fetchData();
    } catch (err) {
      console.error(`Failed to ${action}:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredEmployers = employers.filter(e => filter === 'All' ? true : e.verification_status === filter);
  const filteredCandidates = candidates.filter(c => filter === 'All' ? true : c.verification_status === filter);

  const empStats = {
    pending: employers.filter(e => e.verification_status === 'Pending').length,
    verified: employers.filter(e => e.verification_status === 'Verified').length,
  };
  const candStats = {
    pending: candidates.filter(c => c.verification_status === 'Pending').length,
    verified: candidates.filter(c => c.verification_status === 'Verified').length,
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C]">
      <header className="sticky top-0 z-40 bg-[#0A0F1C]/95 backdrop-blur-lg border-b border-white/10 px-4 py-4">
        <h1 className="text-xl font-bold text-white" data-testid="kyc-dashboard-title">KYC Verification</h1>
        <p className="text-sm text-[#8B95A5]">Review and approve identity documents</p>
      </header>

      {/* Tab Toggle */}
      <div className="px-4 pt-4">
        <div className="flex bg-[#151B2D] rounded-xl p-1">
          <button onClick={() => { setTab('candidates'); setFilter('Pending'); }} className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${tab === 'candidates' ? 'bg-[#0052CC] text-white' : 'text-[#8B95A5]'}`} data-testid="tab-candidates">
            Candidates {candStats.pending > 0 && <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-xs">{candStats.pending}</span>}
          </button>
          <button onClick={() => { setTab('employers'); setFilter('Pending'); }} className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${tab === 'employers' ? 'bg-[#0052CC] text-white' : 'text-[#8B95A5]'}`} data-testid="tab-employers">
            Employers {empStats.pending > 0 && <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-xs">{empStats.pending}</span>}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 p-4">
        <StatCard label="Total" value={tab === 'candidates' ? candidates.length : employers.length} color="#8B95A5" />
        <StatCard label="Pending" value={tab === 'candidates' ? candStats.pending : empStats.pending} color="#F5A623" />
        <StatCard label="Verified" value={tab === 'candidates' ? candStats.verified : empStats.verified} color="#36B37E" />
      </div>

      {/* Filter Tabs */}
      <div className="px-4 flex gap-2 overflow-x-auto pb-2">
        {['Pending', 'Verified', 'Unverified', 'All'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${filter === f ? 'bg-[#0052CC] text-white' : 'bg-[#151B2D] text-[#8B95A5] hover:bg-[#1E2740]'}`} data-testid={`kyc-filter-${f.toLowerCase()}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-[#0052CC] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#8B95A5]">Loading...</p>
          </div>
        ) : tab === 'employers' ? (
          filteredEmployers.length === 0 ? <EmptyState label={filter} /> : filteredEmployers.map(emp => (
            <EmployerCard key={emp._id} employer={emp} onAction={handleEmployerAction} loading={actionLoading === emp._id} />
          ))
        ) : (
          filteredCandidates.length === 0 ? <EmptyState label={filter} /> : filteredCandidates.map(cand => (
            <CandidateKycCard key={cand._id} candidate={cand} onAction={handleCandidateAction} loading={actionLoading === cand._id} />
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-[#151B2D] rounded-xl p-3 text-center">
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-[#8B95A5] text-xs mt-1">{label}</p>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-[#151B2D] rounded-full flex items-center justify-center mx-auto mb-4">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B95A5" strokeWidth="2"><path d="M9 12l2 2 4-4"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
      </div>
      <p className="text-[#8B95A5]">No records in {label} queue</p>
    </div>
  );
}

const statusColors = {
  Pending: 'bg-amber-500/20 text-amber-400',
  Verified: 'bg-[#36B37E]/20 text-[#36B37E]',
  Unverified: 'bg-red-500/20 text-red-400',
};

function EmployerCard({ employer, onAction, loading }) {
  const isPending = employer.verification_status === 'Pending';
  return (
    <div className={`bg-[#151B2D] rounded-2xl p-4 border ${isPending ? 'border-amber-500/30' : 'border-white/5'}`} data-testid="employer-kyc-card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[#8B95A5] text-xs mb-1">Employer</p>
          <h3 className="text-white font-bold text-lg" data-testid="employer-company">{employer.company_name || 'Unknown Business'}</h3>
          <p className="text-[#8B95A5] text-xs">ID: {employer._id?.substring(0, 8)}...</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[employer.verification_status]}`} data-testid="employer-status">
          {employer.verification_status}
        </span>
      </div>
      {employer.verification_document_url && (
        <a href={employer.verification_document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#0A0F1C]/50 rounded-xl p-3 mb-3 hover:bg-[#0A0F1C]/80 transition-all" data-testid="view-document-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span className="text-[#0052CC] text-sm font-medium">View Document</span>
          <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B95A5" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      )}
      {isPending && (
        <div className="flex gap-2">
          <button onClick={() => onAction(employer._id, 'approve')} disabled={loading} className="flex-1 bg-[#36B37E] hover:bg-[#2d9a6a] disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-all" data-testid="approve-kyc-btn">Approve</button>
          <button onClick={() => onAction(employer._id, 'reject')} disabled={loading} className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-all" data-testid="reject-kyc-btn">Reject</button>
        </div>
      )}
    </div>
  );
}

function CandidateKycCard({ candidate, onAction, loading }) {
  const isPending = candidate.verification_status === 'Pending';
  return (
    <div className={`bg-[#151B2D] rounded-2xl p-4 border ${isPending ? 'border-amber-500/30' : 'border-white/5'}`} data-testid="candidate-kyc-card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[#8B95A5] text-xs mb-1">Candidate</p>
          <h3 className="text-white font-bold text-lg" data-testid="candidate-kyc-name">{candidate.name || 'Unknown'}</h3>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {candidate.education_level && <span className="bg-[#0A0F1C] text-[#8B95A5] text-xs px-2 py-0.5 rounded-lg">{candidate.education_level}</span>}
            {candidate.english_level && <span className="bg-[#0A0F1C] text-[#8B95A5] text-xs px-2 py-0.5 rounded-lg">{candidate.english_level}</span>}
            {candidate.experience_type && <span className="bg-[#0A0F1C] text-[#8B95A5] text-xs px-2 py-0.5 rounded-lg">{candidate.experience_type}</span>}
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[candidate.verification_status] || statusColors.Unverified}`} data-testid="candidate-kyc-status">
          {candidate.verification_status || 'Unverified'}
        </span>
      </div>
      {candidate.id_document_url && (
        <a href={candidate.id_document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#0A0F1C]/50 rounded-xl p-3 mb-3 hover:bg-[#0A0F1C]/80 transition-all" data-testid="view-id-document-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span className="text-[#0052CC] text-sm font-medium">View ID Document</span>
          <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B95A5" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      )}
      {candidate.address && <p className="text-[#8B95A5] text-xs mb-3">Address: {candidate.address}</p>}
      {isPending && (
        <div className="flex gap-2">
          <button onClick={() => onAction(candidate._id, 'approve')} disabled={loading} className="flex-1 bg-[#36B37E] hover:bg-[#2d9a6a] disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-all" data-testid="approve-candidate-kyc-btn">Approve</button>
          <button onClick={() => onAction(candidate._id, 'reject')} disabled={loading} className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-xl font-medium transition-all" data-testid="reject-candidate-kyc-btn">Reject</button>
        </div>
      )}
      {candidate.verification_status === 'Verified' && (
        <div className="bg-[#36B37E]/10 border border-[#36B37E]/30 rounded-xl p-3 text-center">
          <p className="text-[#36B37E] font-medium text-sm">Identity Verified</p>
        </div>
      )}
    </div>
  );
}
