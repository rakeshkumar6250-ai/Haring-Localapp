'use client';

import { useState, useEffect } from 'react';

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

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
              <button
                className="w-full bg-[#0052CC] hover:bg-[#003d99] text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98]"
                data-testid="apply-btn"
              >
                Apply Now
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
