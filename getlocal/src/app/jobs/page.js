'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function JobsPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const [applyingId, setApplyingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadApplied = useCallback(async () => {
    if (!token) {
      setAppliedJobIds([]);
      return;
    }
    try {
      const res = await fetch('/nextapi/applications', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAppliedJobIds(data.appliedJobIds || []);
      }
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await fetch('/nextapi/jobs');
        const data = await res.json();
        setJobs(data.jobs || []);
      } catch {
        console.error('Failed to fetch jobs');
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  useEffect(() => {
    loadApplied();
  }, [loadApplied]);

  const handleApply = async (jobId) => {
    if (!user || !token) {
      router.push('/login');
      return;
    }
    if (appliedJobIds.includes(jobId)) return;
    setApplyingId(jobId);
    try {
      const res = await fetch('/nextapi/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.status === 409) {
        setAppliedJobIds((prev) => [...new Set([...prev, jobId])]);
        showToast('You have already applied for this job.', 'error');
        return;
      }
      if (!res.ok) {
        showToast(data.error || 'Failed to apply. Please try again.', 'error');
        return;
      }
      setAppliedJobIds((prev) => [...new Set([...prev, jobId])]);
      showToast('Application submitted!', 'success');
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-[#0A0F1C]/95 backdrop-blur-lg border-b border-white/10 px-4 py-4">
        <h1 className="text-xl font-bold text-white" data-testid="jobs-title">Available Jobs</h1>
        <p className="text-sm text-[#8B95A5]">{jobs.length} openings near you</p>
      </header>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-[#0052CC] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#8B95A5]">Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-state">
            <div className="w-16 h-16 bg-[#151B2D] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B95A5" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
            <p className="text-white font-medium text-lg mb-1">No jobs posted yet</p>
            <p className="text-[#8B95A5] text-sm">Check back soon for new openings.</p>
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job._id} className="bg-[#151B2D] rounded-2xl p-5 border border-white/5 transition-all hover:border-white/10" data-testid="job-card">
              {/* Top row: title + badges */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg text-white" data-testid="job-role">{job.title}</h3>
                  {(job.employer_company || job.company_name) && (
                    <p className="text-[#8B95A5] text-sm mt-0.5">{job.employer_company || job.company_name}</p>
                  )}
                </div>
                {job.job_type && (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ml-3 ${
                    job.job_type === 'Part Time'
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-[#0052CC]/15 text-[#0052CC]'
                  }`} data-testid="job-type-badge">
                    {job.job_type}
                  </span>
                )}
              </div>

              {/* Info chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {/* Salary */}
                {(job.salary?.display || job.salary) && (
                  <span className="inline-flex items-center gap-1.5 bg-[#36B37E]/10 text-[#36B37E] text-sm px-3 py-1.5 rounded-lg font-semibold" data-testid="job-salary">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    {job.salary?.display || `₹${job.salary}`}
                  </span>
                )}
                {/* Location */}
                {(job.employer_location || job.location?.label) && (
                  <span className="inline-flex items-center gap-1.5 bg-[#8B95A5]/10 text-[#8B95A5] text-sm px-3 py-1.5 rounded-lg" data-testid="job-location">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {job.employer_location || job.location?.label}
                  </span>
                )}
                {/* Category */}
                {job.category && (
                  <span className="inline-flex items-center gap-1.5 bg-[#0052CC]/10 text-[#0052CC] text-sm px-3 py-1.5 rounded-lg" data-testid="job-category">
                    {job.category}
                  </span>
                )}
              </div>

              {/* Description preview */}
              {(job.job_description || job.job_expectations) && (
                <p className="text-[#8B95A5] text-sm mb-4 line-clamp-2" data-testid="job-description">
                  {job.job_description || job.job_expectations}
                </p>
              )}

              {/* Apply button */}
              {appliedJobIds.includes(job._id) ? (
                <button
                  disabled
                  className="w-full bg-[#36B37E]/15 text-[#36B37E] font-semibold py-3 rounded-xl flex items-center justify-center gap-2 cursor-default"
                  data-testid={`applied-btn-${job._id}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  Applied
                </button>
              ) : (
                <button
                  onClick={() => handleApply(job._id)}
                  disabled={applyingId === job._id}
                  className="w-full bg-[#0052CC] hover:bg-[#003d99] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  data-testid="apply-btn"
                >
                  {applyingId === job._id ? (
                    <>
                      <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" /></svg>
                      Applying...
                    </>
                  ) : (
                    'Apply Now'
                  )}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
            toast.type === 'error'
              ? 'bg-red-500/90 text-white'
              : toast.type === 'success'
              ? 'bg-[#36B37E] text-white'
              : 'bg-[#151B2D] text-white border border-white/10'
          }`}
          data-testid="jobs-toast"
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
