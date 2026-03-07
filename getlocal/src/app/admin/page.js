'use client';

import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [stats, setStats] = useState({
    totalCandidates: 0,
    openJobs: 0,
    creditsSold: 0
  });
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blastingJob, setBlastingJob] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch stats
      const candidatesRes = await fetch('/api/candidates');
      const candidatesData = await candidatesRes.json();
      
      const jobsRes = await fetch('/api/jobs');
      const jobsData = await jobsRes.json();

      setStats({
        totalCandidates: candidatesData.candidates?.length || 0,
        openJobs: jobsData.jobs?.filter(j => j.status === 'Open').length || 0,
        creditsSold: jobsData.totalCredits || 0
      });
      
      setJobs(jobsData.jobs || []);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = async (jobId) => {
    setBlastingJob(jobId);
    
    // Simulate WhatsApp blast
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In production, this would call MoltBot's WhatsApp integration
    console.log(`[BROADCAST] WhatsApp blast triggered for job ${jobId}`);
    
    setBlastingJob(null);
    alert('WhatsApp broadcast sent to matching candidates!');
  };

  const StatCard = ({ label, value, icon, color }) => (
    <div className="bg-[#151B2D] rounded-2xl p-5 border border-white/5" data-testid={`stat-${label.toLowerCase().replace(' ', '-')}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#8B95A5] text-sm mb-1">{label}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#0052CC] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="px-4 py-6">
        <h1 className="text-2xl font-bold">Agent Dashboard</h1>
        <p className="text-[#8B95A5]">Manage broadcasts and monitor activity</p>
      </header>

      {/* Stats Bar */}
      <div className="px-4 grid grid-cols-3 gap-3 mb-6">
        <StatCard
          label="Total Candidates"
          value={stats.totalCandidates}
          color="bg-[#0052CC]/20"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <StatCard
          label="Open Jobs"
          value={stats.openJobs}
          color="bg-[#36B37E]/20"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#36B37E" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          }
        />
        <StatCard
          label="Credits Sold"
          value={stats.creditsSold}
          color="bg-[#FFAB00]/20"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFAB00" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v12" />
              <path d="M8 10h8" />
              <path d="M8 14h8" />
            </svg>
          }
        />
      </div>

      {/* Broadcast List */}
      <div className="px-4">
        <h2 className="text-lg font-bold mb-4">Active Jobs</h2>
        
        {jobs.length === 0 ? (
          <div className="bg-[#151B2D] rounded-2xl p-8 text-center">
            <p className="text-[#8B95A5]">No active jobs yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job._id}
                className="bg-[#151B2D] rounded-xl p-4 border border-white/5 flex items-center justify-between"
                data-testid="job-row"
              >
                <div className="flex-1">
                  <h3 className="font-semibold" data-testid="job-title">{job.title}</h3>
                  <p className="text-[#8B95A5] text-sm">{job.business_name}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      job.status === 'Open' ? 'bg-[#36B37E]/20 text-[#36B37E]' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {job.status}
                    </span>
                    <span className="text-xs text-[#8B95A5]">
                      📍 {job.location?.city || 'Unknown'}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleBroadcast(job._id)}
                  disabled={blastingJob === job._id || job.status !== 'Open'}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    blastingJob === job._id
                      ? 'bg-orange-500 text-white blasting'
                      : job.status === 'Open'
                      ? 'bg-[#0052CC] hover:bg-[#003d99] text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                  data-testid="broadcast-btn"
                >
                  {blastingJob === job._id ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
                      </svg>
                      Blasting...
                    </span>
                  ) : (
                    'Trigger WhatsApp Blast'
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => window.location.href = '/join'}
            className="bg-[#151B2D] hover:bg-[#1a2236] border border-white/5 rounded-xl p-4 text-left transition-all"
          >
            <div className="w-10 h-10 bg-[#0052CC]/20 rounded-lg flex items-center justify-center mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            </div>
            <p className="font-medium">Add Candidate</p>
            <p className="text-[#8B95A5] text-sm">Manual onboarding</p>
          </button>
          
          <button
            onClick={() => alert('Job posting coming soon!')}
            className="bg-[#151B2D] hover:bg-[#1a2236] border border-white/5 rounded-xl p-4 text-left transition-all"
          >
            <div className="w-10 h-10 bg-[#36B37E]/20 rounded-lg flex items-center justify-center mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#36B37E" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
            <p className="font-medium">Post Job</p>
            <p className="text-[#8B95A5] text-sm">Create listing</p>
          </button>
        </div>
      </div>
    </div>
  );
}