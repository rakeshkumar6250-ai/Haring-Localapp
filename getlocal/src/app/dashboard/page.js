'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

function statusStyle(status) {
  const s = (status || 'pending').toLowerCase();
  if (s === 'reviewed') return 'bg-[#0052CC]/15 text-[#0052CC]';
  if (s === 'contacted' || s === 'hired') return 'bg-[#36B37E]/15 text-[#36B37E]';
  if (s === 'rejected') return 'bg-red-500/15 text-red-400';
  return 'bg-amber-500/15 text-amber-400'; // pending
}

const STATUSES = ['pending', 'reviewed', 'contacted', 'hired', 'rejected'];

export default function DashboardPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast] = useState(null);
  const [premium, setPremium] = useState({ paymentVerificationPending: false, hasPremiumAccess: false });
  const [showPayModal, setShowPayModal] = useState(false);
  const [paying, setPaying] = useState(false);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadPremium = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/nextapi/payments/manual-upi', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setPremium(await res.json());
    } catch {
      /* ignore */
    }
  }, [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/nextapi/employer/jobs', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && user) {
      load();
      loadPremium();
    }
  }, [authLoading, user, load, loadPremium]);

  const handleIHavePaid = async () => {
    setPaying(true);
    try {
      const res = await fetch('/nextapi/payments/manual-upi', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('failed');
      setPremium((p) => ({ ...p, paymentVerificationPending: true }));
      setShowPayModal(false);
      showToast('Thanks! Your premium access will be unlocked shortly.', 'success');
    } catch {
      showToast('Could not record payment. Please try again.', 'error');
    } finally {
      setPaying(false);
    }
  };

  const updateStatus = async (jobId, applicationId, newStatus) => {
    let snapshot;
    setJobs((prev) => {
      snapshot = prev;
      return prev.map((j) =>
        j._id !== jobId
          ? j
          : {
              ...j,
              applicants: j.applicants.map((a) =>
                a.applicationId === applicationId ? { ...a, status: newStatus } : a
              ),
            }
      );
    });
    showToast(`Marked as ${newStatus}`, 'success');
    try {
      const res = await fetch(`/nextapi/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('save failed');
    } catch {
      if (snapshot) setJobs(snapshot);
      showToast('Could not save status. Reverted.', 'error');
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0052CC] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalApplicants = jobs.reduce((sum, j) => sum + j.applicant_count, 0);

  return (
    <div className="min-h-screen pb-24" data-testid="dashboard-page">
      <header className="sticky top-0 z-40 bg-[#0A0F1C]/95 backdrop-blur-lg border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white" data-testid="dashboard-title">My Job Postings</h1>
            <p className="text-sm text-[#8B95A5]">
              {jobs.length} active {jobs.length === 1 ? 'listing' : 'listings'} · {totalApplicants} total applicants
            </p>
          </div>
          <a
            href="/hire"
            className="bg-[#0052CC] hover:bg-[#003d99] text-white text-sm font-semibold px-3.5 py-2 rounded-xl transition-all active:scale-95"
            data-testid="post-job-link"
          >
            + Post Job
          </a>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Premium unlock CTA */}
        <div className="bg-gradient-to-r from-[#1a1f33] to-[#151B2D] border border-[#D4A017]/30 rounded-2xl p-4 flex items-center justify-between gap-3" data-testid="premium-banner">
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#F5C518"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21.4 8 14 2 9.4h7.6z"/></svg>
              Premium Access
            </p>
            <p className="text-[#8B95A5] text-xs mt-0.5">Unlock candidate contacts for just ₹99.</p>
          </div>
          {premium.hasPremiumAccess ? (
            <span className="shrink-0 bg-[#36B37E]/15 text-[#36B37E] text-sm font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5" data-testid="premium-active">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Premium Active
            </span>
          ) : premium.paymentVerificationPending ? (
            <button
              disabled
              className="shrink-0 bg-amber-500/15 text-amber-400 text-sm font-semibold px-3.5 py-2 rounded-xl cursor-default"
              data-testid="premium-pending"
            >
              Payment Verification Pending
            </button>
          ) : (
            <button
              onClick={() => setShowPayModal(true)}
              className="shrink-0 bg-gradient-to-r from-[#D4A017] to-[#F5C518] text-[#0A0F1C] text-sm font-bold px-4 py-2 rounded-xl transition-all active:scale-95"
              data-testid="pay-premium-btn"
            >
              Pay to Unlock Premium
            </button>
          )}
        </div>
        {loading ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-[#0052CC] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#8B95A5]">Loading your postings...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16" data-testid="dashboard-empty">
            <p className="text-white font-medium text-lg mb-1">No job postings yet</p>
            <p className="text-[#8B95A5] text-sm mb-6">Post your first job to start receiving applicants.</p>
            <a href="/hire" className="inline-block bg-[#0052CC] hover:bg-[#003d99] text-white font-semibold px-6 py-3 rounded-xl transition-all">
              Post a Job
            </a>
          </div>
        ) : (
          jobs.map((job) => {
            const isOpen = expanded === job._id;
            return (
              <div
                key={job._id}
                className="bg-[#151B2D] rounded-2xl border border-white/5 overflow-hidden"
                data-testid="dashboard-job-card"
              >
                {/* Job header (clickable) */}
                <button
                  onClick={() => setExpanded(isOpen ? null : job._id)}
                  className="w-full text-left p-5 transition-all hover:bg-white/[0.02]"
                  data-testid={`job-toggle-${job._id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-base text-white truncate">{job.title}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {job.location && (
                          <span className="inline-flex items-center gap-1 bg-[#8B95A5]/10 text-[#8B95A5] text-xs px-2.5 py-1 rounded-lg">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            {job.location}
                          </span>
                        )}
                        {job.salary && (
                          <span className="bg-[#36B37E]/10 text-[#36B37E] text-xs px-2.5 py-1 rounded-lg font-semibold">{job.salary}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-bold px-2.5 py-1.5 rounded-full ${
                          job.applicant_count > 0 ? 'bg-[#0052CC]/15 text-[#0052CC]' : 'bg-[#8B95A5]/10 text-[#8B95A5]'
                        }`}
                        data-testid={`applicant-badge-${job._id}`}
                      >
                        Applicants ({job.applicant_count})
                      </span>
                      <svg
                        width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B95A5" strokeWidth="2"
                        className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Applicant list (expandable) */}
                {isOpen && (
                  <div className="border-t border-white/5 px-5 py-4 space-y-3" data-testid={`applicants-${job._id}`}>
                    {job.applicants.length === 0 ? (
                      <p className="text-[#8B95A5] text-sm text-center py-2">No applicants yet for this job.</p>
                    ) : (
                      job.applicants.map((a) => (
                        <div key={a.applicationId} className="flex items-center gap-3" data-testid="applicant-row">
                          <div className="w-10 h-10 shrink-0 rounded-full bg-[#0052CC]/15 text-[#0052CC] font-bold text-sm flex items-center justify-center">
                            {initials(a.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm truncate">{a.name}</p>
                            <p className="text-[#8B95A5] text-xs truncate">
                              {[a.category, a.location].filter(Boolean).join(' · ') || 'Profile details unavailable'}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <select
                                value={a.status}
                                onChange={(e) => updateStatus(job._id, a.applicationId, e.target.value)}
                                className={`text-[11px] font-semibold pl-2 pr-6 py-1 rounded-full capitalize appearance-none cursor-pointer border-0 focus:outline-none focus:ring-1 focus:ring-white/30 ${statusStyle(a.status)}`}
                                data-testid={`status-select-${a.applicationId}`}
                                style={{ backgroundImage: 'none' }}
                              >
                                {STATUSES.map((s) => (
                                  <option key={s} value={s} className="bg-[#151B2D] text-white capitalize">
                                    {s}
                                  </option>
                                ))}
                              </select>
                              {a.phone ? (
                                <a
                                  href={`tel:${a.phone}`}
                                  className="bg-[#36B37E] hover:bg-[#2d9a6a] text-white text-[11px] font-semibold px-3 py-1 rounded-full transition-all active:scale-95"
                                  data-testid={`contact-${a.applicationId}`}
                                >
                                  Contact
                                </a>
                              ) : (
                                <span className="text-[#8B95A5] text-[11px]">No contact</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Manual UPI payment modal */}
      {showPayModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !paying && setShowPayModal(false)}
          data-testid="upi-modal"
        >
          <div
            className="bg-[#151B2D] border border-white/10 rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Pay ₹99 via UPI</h3>
              <button
                onClick={() => !paying && setShowPayModal(false)}
                className="text-[#8B95A5] hover:text-white transition-colors"
                data-testid="upi-modal-close"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* QR placeholder (image file swapped in later) */}
            <div className="bg-white/10 border border-white/10 rounded-xl aspect-square w-48 mx-auto flex flex-col items-center justify-center text-[#8B95A5] mb-4" data-testid="upi-qr-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
                <line x1="14" y1="14" x2="14" y2="21"/><line x1="18" y1="14" x2="18" y2="18"/><line x1="21" y1="14" x2="21" y2="21"/>
              </svg>
              <span className="text-xs mt-2">UPI QR Code</span>
            </div>

            <p className="text-[#8B95A5] text-sm text-center mb-5">
              Scan &amp; pay <span className="text-white font-semibold">₹99</span> via any UPI app to unlock candidate contacts.
            </p>

            <button
              onClick={handleIHavePaid}
              disabled={paying}
              className="w-full bg-gradient-to-r from-[#D4A017] to-[#F5C518] text-[#0A0F1C] font-bold py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              data-testid="i-have-paid-btn"
            >
              {paying ? (
                <>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20"/></svg>
                  Submitting...
                </>
              ) : (
                'I have paid'
              )}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
            toast.type === 'error'
              ? 'bg-red-500/90 text-white'
              : toast.type === 'success'
              ? 'bg-[#36B37E] text-white'
              : 'bg-[#151B2D] text-white border border-white/10'
          }`}
          data-testid="dashboard-toast"
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
