'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';

const ROLES = [
  'Driver', 'Cook', 'Delivery', 'Security Guard', 'House Helper',
  'Electrician', 'Plumber', 'Carpenter', 'Cleaner', 'Gardener',
  'Receptionist', 'Data Entry', 'Warehouse', 'Mechanic', 'Tailor',
  'Painter', 'AC Technician', 'General Helper'
];

export default function HirePage() {
  const { user, token, loading: authLoading } = useAuth();
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [salary, setSalary] = useState('');
  const [jobType, setJobType] = useState('Full-Time');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!role || !location.trim() || !salary) {
      setError('Role, Location, and Salary are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/nextapi/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          role,
          location: { lat: 28.6139, lng: 77.2090, label: location.trim() },
          salary: { display: `₹${Number(salary).toLocaleString('en-IN')}/month`, amount: Number(salary) },
          jobType: jobType === 'Full-Time' ? 'Full Time' : 'Part Time',
          company_name: user?.company_name || '',
          employer_id: user?.id || null,
          employer_location: location.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to post job');
        return;
      }
      setSuccess(true);
      setRole('');
      setLocation('');
      setSalary('');
      setJobType('Full-Time');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0052CC] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white" data-testid="hire-title">Post a New Job</h1>
        <p className="text-[#8B95A5] text-sm mt-1">
          {user.company_name} &mdash; fill in the details below
        </p>
      </header>

      {success ? (
        <div className="bg-[#151B2D] border border-[#36B37E]/40 rounded-2xl p-8 text-center" data-testid="success-message">
          <div className="w-16 h-16 bg-[#36B37E]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#36B37E" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Job Posted Successfully!</h2>
          <p className="text-[#8B95A5] text-sm mb-6">Your listing is now live and visible to candidates.</p>
          <button
            onClick={() => setSuccess(false)}
            className="bg-[#0052CC] hover:bg-[#003d99] text-white font-semibold px-6 py-3 rounded-xl transition-all"
            data-testid="post-another-btn"
          >
            Post Another Job
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-[#8B95A5] mb-1.5">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#0052CC] appearance-none"
              data-testid="role-select"
            >
              <option value="" disabled>Select a role</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-[#8B95A5] mb-1.5">Work Location</label>
            <input
              type="text"
              placeholder="e.g. Connaught Place, Delhi"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#0052CC]"
              data-testid="location-input"
            />
          </div>

          {/* Salary */}
          <div>
            <label className="block text-sm font-medium text-[#8B95A5] mb-1.5">Monthly Salary (₹)</label>
            <input
              type="number"
              placeholder="e.g. 15000"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#0052CC]"
              data-testid="salary-input"
              min="0"
            />
          </div>

          {/* Job Type */}
          <div>
            <label className="block text-sm font-medium text-[#8B95A5] mb-1.5">Job Type</label>
            <div className="flex gap-3">
              {['Full-Time', 'Part-Time'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setJobType(type)}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all border ${
                    jobType === type
                      ? 'bg-[#0052CC] border-[#0052CC] text-white'
                      : 'bg-[#151B2D] border-white/10 text-[#8B95A5] hover:border-white/20'
                  }`}
                  data-testid={`jobtype-${type.toLowerCase()}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm" data-testid="form-error">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#36B37E] hover:bg-[#2d9a6a] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
            data-testid="submit-job-btn"
          >
            {submitting ? (
              <>
                <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20"/></svg>
                Posting...
              </>
            ) : 'Post Job'}
          </button>
        </form>
      )}
    </div>
  );
}
