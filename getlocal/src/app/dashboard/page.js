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

export default function DashboardPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

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
    if (!authLoading && user) load();
  }, [authLoading, user, load]);

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
                            <div className="flex items-center gap-2">
                              <p className="text-white font-semibold text-sm truncate">{a.name}</p>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusStyle(a.status)}`} data-testid="applicant-status">
                                {a.status}
                              </span>
                            </div>
                            <p className="text-[#8B95A5] text-xs truncate">
                              {[a.category, a.location].filter(Boolean).join(' · ') || 'Profile details unavailable'}
                            </p>
                          </div>
                          {a.phone ? (
                            <a
                              href={`tel:${a.phone}`}
                              className="bg-[#36B37E] hover:bg-[#2d9a6a] text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all active:scale-95 shrink-0"
                              data-testid={`contact-${a.applicationId}`}
                            >
                              Contact
                            </a>
                          ) : (
                            <span className="text-[#8B95A5] text-xs shrink-0">No contact</span>
                          )}
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
    </div>
  );
}
