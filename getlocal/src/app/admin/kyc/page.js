'use client';

import { useState, useEffect, useCallback } from 'react';

export default function AdminKycPage() {
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Pending');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchEmployers = useCallback(async () => {
    try {
      const res = await fetch('/nextapi/employers');
      const data = await res.json();
      setEmployers(data.employers || []);
    } catch (err) {
      console.error('Failed to fetch employers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployers();
    const interval = setInterval(fetchEmployers, 10000);
    return () => clearInterval(interval);
  }, [fetchEmployers]);

  const handleAction = async (employerId, action) => {
    setActionLoading(employerId);
    try {
      const res = await fetch('/nextapi/employers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employer_id: employerId, action }),
      });
      if (res.ok) fetchEmployers();
    } catch (err) {
      console.error(`Failed to ${action} employer:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = employers.filter(e => {
    if (filter === 'All') return true;
    return e.verification_status === filter;
  });

  const stats = {
    total: employers.length,
    pending: employers.filter(e => e.verification_status === 'Pending').length,
    verified: employers.filter(e => e.verification_status === 'Verified').length,
    unverified: employers.filter(e => e.verification_status === 'Unverified').length,
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C]">
      <header className="sticky top-0 z-40 bg-[#0A0F1C]/95 backdrop-blur-lg border-b border-white/10 px-4 py-4">
        <h1 className="text-xl font-bold text-white" data-testid="kyc-dashboard-title">KYC Verification Queue</h1>
        <p className="text-sm text-[#8B95A5]">Review and approve employer documents</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 p-4">
        <StatCard label="Total" value={stats.total} color="#8B95A5" />
        <StatCard label="Pending" value={stats.pending} color="#F5A623" />
        <StatCard label="Verified" value={stats.verified} color="#36B37E" />
        <StatCard label="Unverified" value={stats.unverified} color="#FF5630" />
      </div>

      {/* Filter Tabs */}
      <div className="px-4 flex gap-2 overflow-x-auto pb-2">
        {['Pending', 'Verified', 'Unverified', 'All'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${filter === f ? 'bg-[#0052CC] text-white' : 'bg-[#151B2D] text-[#8B95A5] hover:bg-[#1E2740]'}`} data-testid={`kyc-filter-${f.toLowerCase()}`}>
            {f} {f === 'Pending' && stats.pending > 0 ? `(${stats.pending})` : ''}
          </button>
        ))}
      </div>

      {/* Employer Cards */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-[#0052CC] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#8B95A5]">Loading employers...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[#151B2D] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B95A5" strokeWidth="2"><path d="M9 12l2 2 4-4"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
            </div>
            <p className="text-[#8B95A5]">No employers in {filter} queue</p>
          </div>
        ) : (
          filtered.map(emp => (
            <EmployerCard key={emp._id} employer={emp} onAction={handleAction} loading={actionLoading === emp._id} />
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

function EmployerCard({ employer, onAction, loading }) {
  const isPending = employer.verification_status === 'Pending';
  const isVerified = employer.verification_status === 'Verified';
  const hasDoc = !!employer.verification_document_url;

  const statusColors = {
    Pending: 'bg-amber-500/20 text-amber-400',
    Verified: 'bg-[#36B37E]/20 text-[#36B37E]',
    Unverified: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className={`bg-[#151B2D] rounded-2xl p-4 border ${isPending ? 'border-amber-500/30' : 'border-white/5'}`} data-testid="employer-kyc-card">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-white font-bold text-lg" data-testid="employer-company">{employer.company_name || 'Unknown Business'}</h3>
          <p className="text-[#8B95A5] text-xs">ID: {employer._id?.substring(0, 8)}...</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[employer.verification_status]}`} data-testid="employer-status">
          {employer.verification_status}
        </span>
      </div>

      {/* Document Link */}
      {hasDoc && (
        <a href={employer.verification_document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#0A0F1C]/50 rounded-xl p-3 mb-3 hover:bg-[#0A0F1C]/80 transition-all" data-testid="view-document-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span className="text-[#0052CC] text-sm font-medium">View Uploaded Document</span>
          <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B95A5" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      )}

      {!hasDoc && (
        <div className="bg-[#0A0F1C]/50 rounded-xl p-3 mb-3">
          <p className="text-[#8B95A5] text-sm">No document uploaded</p>
        </div>
      )}

      {/* Timestamps */}
      <div className="flex gap-4 text-[#8B95A5] text-xs mb-3">
        <span>Created: {new Date(employer.created_at).toLocaleDateString()}</span>
        {employer.verified_at && <span>Verified: {new Date(employer.verified_at).toLocaleDateString()}</span>}
      </div>

      {/* Action Buttons - Only for Pending */}
      {isPending && (
        <div className="flex gap-2">
          <button onClick={() => onAction(employer._id, 'approve')} disabled={loading} className="flex-1 bg-[#36B37E] hover:bg-[#2d9a6a] disabled:opacity-50 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-all" data-testid="approve-kyc-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            Approve
          </button>
          <button onClick={() => onAction(employer._id, 'reject')} disabled={loading} className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-all" data-testid="reject-kyc-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Reject
          </button>
        </div>
      )}

      {isVerified && (
        <div className="bg-[#36B37E]/10 border border-[#36B37E]/30 rounded-xl p-3 text-center">
          <p className="text-[#36B37E] font-medium text-sm">Business Verified</p>
        </div>
      )}
    </div>
  );
}
