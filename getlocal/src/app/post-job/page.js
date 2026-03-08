'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const JOB_CATEGORIES = [
  'Driver', 'Cook', 'Delivery', 'Security Guard', 'House Helper', 
  'Electrician', 'Plumber', 'Carpenter', 'Cleaner', 'Cashier', 'General'
];

const PERKS_OPTIONS = [
  { id: 'meals', label: 'Free Meals', icon: '🍽️' },
  { id: 'accommodation', label: 'Accommodation', icon: '🏠' },
  { id: 'pf_esi', label: 'PF/ESI', icon: '🏥' },
  { id: 'transport', label: 'Transport', icon: '🚌' },
  { id: 'uniform', label: 'Uniform Provided', icon: '👔' },
  { id: 'bonus', label: 'Performance Bonus', icon: '💰' },
];

export default function PostJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    required_experience: 0,
    location_radius: 10,
    salary_type: 'fixed',
    salary_fixed: '',
    salary_min: '',
    salary_max: '',
    perks: [],
    training_provided: false,
    job_expectations: '',
    employer_location: '' // NEW: Employer address/area
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: 28.6139, lng: 77.2090 })
      );
    } else {
      setUserLocation({ lat: 28.6139, lng: 77.2090 });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.title.trim()) {
      setError('Please enter a job title');
      return;
    }
    if (!formData.category) {
      setError('Please select a category');
      return;
    }

    setLoading(true);
    try {
      // Format salary data
      let salaryData = {};
      if (formData.salary_type === 'fixed' && formData.salary_fixed) {
        salaryData = {
          type: 'fixed',
          amount: parseInt(formData.salary_fixed),
          display: `₹${parseInt(formData.salary_fixed).toLocaleString()}/month`
        };
      } else if (formData.salary_type === 'range' && formData.salary_min && formData.salary_max) {
        salaryData = {
          type: 'range',
          min: parseInt(formData.salary_min),
          max: parseInt(formData.salary_max),
          display: `₹${parseInt(formData.salary_min).toLocaleString()} - ₹${parseInt(formData.salary_max).toLocaleString()}/month`
        };
      }

      const res = await fetch('/nextapi/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          category: formData.category,
          required_experience: parseInt(formData.required_experience),
          location_radius: parseInt(formData.location_radius),
          location: userLocation,
          salary: salaryData,
          perks: formData.perks,
          training_provided: formData.training_provided,
          job_expectations: formData.job_expectations.trim(),
          employer_location: formData.employer_location.trim()
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/hire'), 1500);
      } else {
        setError(data.error || 'Failed to post job');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const togglePerk = (perkId) => {
    setFormData(prev => ({
      ...prev,
      perks: prev.perks.includes(perkId)
        ? prev.perks.filter(p => p !== perkId)
        : [...prev.perks, perkId]
    }));
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0F1C] px-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#36B37E] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Job Posted!</h2>
          <p className="text-[#8B95A5]">Redirecting to candidates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0A0F1C]/95 backdrop-blur-lg border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 bg-[#151B2D] rounded-xl flex items-center justify-center"
            data-testid="back-btn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Post a Job</h1>
            <p className="text-sm text-[#8B95A5]">Find the right candidate</p>
          </div>
        </div>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm" data-testid="error-message">
            {error}
          </div>
        )}

        {/* Job Title */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#8B95A5]">
            Job Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="e.g., Need experienced driver for delivery"
            className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-4 py-4 text-white placeholder-[#8B95A5]/50 focus:border-[#0052CC] transition-all"
            data-testid="job-title-input"
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#8B95A5]">
            Category <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2" data-testid="category-grid">
            {JOB_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleChange('category', cat)}
                className={`px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                  formData.category === cat
                    ? 'bg-[#0052CC] text-white'
                    : 'bg-[#151B2D] text-[#8B95A5] hover:bg-[#1E2740]'
                }`}
                data-testid={`category-${cat.toLowerCase().replace(' ', '-')}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Salary */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[#8B95A5]">Salary Offered</label>
          
          {/* Salary Type Toggle */}
          <div className="flex bg-[#151B2D] rounded-xl p-1 mb-3">
            <button
              type="button"
              onClick={() => handleChange('salary_type', 'fixed')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                formData.salary_type === 'fixed' ? 'bg-[#0052CC] text-white' : 'text-[#8B95A5]'
              }`}
            >
              Fixed Monthly
            </button>
            <button
              type="button"
              onClick={() => handleChange('salary_type', 'range')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                formData.salary_type === 'range' ? 'bg-[#0052CC] text-white' : 'text-[#8B95A5]'
              }`}
            >
              Salary Range
            </button>
          </div>

          {formData.salary_type === 'fixed' ? (
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B95A5]">₹</span>
              <input
                type="number"
                value={formData.salary_fixed}
                onChange={(e) => handleChange('salary_fixed', e.target.value)}
                placeholder="15000"
                className="w-full bg-[#151B2D] border border-white/10 rounded-xl pl-8 pr-20 py-3 text-white"
                data-testid="salary-fixed-input"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B95A5] text-sm">/month</span>
            </div>
          ) : (
            <div className="flex gap-3 items-center">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B95A5]">₹</span>
                <input
                  type="number"
                  value={formData.salary_min}
                  onChange={(e) => handleChange('salary_min', e.target.value)}
                  placeholder="10000"
                  className="w-full bg-[#151B2D] border border-white/10 rounded-xl pl-7 pr-3 py-3 text-white"
                  data-testid="salary-min-input"
                />
              </div>
              <span className="text-[#8B95A5]">to</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B95A5]">₹</span>
                <input
                  type="number"
                  value={formData.salary_max}
                  onChange={(e) => handleChange('salary_max', e.target.value)}
                  placeholder="20000"
                  className="w-full bg-[#151B2D] border border-white/10 rounded-xl pl-7 pr-3 py-3 text-white"
                  data-testid="salary-max-input"
                />
              </div>
            </div>
          )}
        </div>

        {/* Perks */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[#8B95A5]">Perks & Benefits</label>
          <div className="grid grid-cols-2 gap-2">
            {PERKS_OPTIONS.map((perk) => (
              <button
                key={perk.id}
                type="button"
                onClick={() => togglePerk(perk.id)}
                className={`flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                  formData.perks.includes(perk.id)
                    ? 'bg-[#36B37E]/20 text-[#36B37E] border border-[#36B37E]/50'
                    : 'bg-[#151B2D] text-[#8B95A5] border border-white/10'
                }`}
                data-testid={`perk-${perk.id}`}
              >
                <span>{perk.icon}</span>
                <span>{perk.label}</span>
                {formData.perks.includes(perk.id) && (
                  <svg className="ml-auto" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Training Provided */}
        <div className="bg-[#151B2D] border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Training Provided?</p>
              <p className="text-[#8B95A5] text-sm">Will you train freshers?</p>
            </div>
            <button
              type="button"
              onClick={() => handleChange('training_provided', !formData.training_provided)}
              className={`w-14 h-8 rounded-full transition-all ${
                formData.training_provided ? 'bg-[#36B37E]' : 'bg-[#8B95A5]/30'
              }`}
              data-testid="training-toggle"
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${
                formData.training_provided ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Required Experience */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[#8B95A5]">Required Experience</label>
          <div className="bg-[#151B2D] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-medium">
                {formData.required_experience === 0 ? 'Fresher OK' : `${formData.required_experience} years minimum`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={formData.required_experience}
              onChange={(e) => handleChange('required_experience', e.target.value)}
              className="w-full accent-[#0052CC]"
              data-testid="experience-slider"
            />
            <div className="flex justify-between text-xs text-[#8B95A5] mt-2">
              <span>Fresher</span>
              <span>5 yrs</span>
              <span>10+ yrs</span>
            </div>
          </div>
        </div>

        {/* Location Radius */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[#8B95A5]">Search Radius</label>
          <div className="bg-[#151B2D] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-medium">{formData.location_radius} km</span>
              <span className="text-[#36B37E] text-sm">📍 From your location</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={formData.location_radius}
              onChange={(e) => handleChange('location_radius', e.target.value)}
              className="w-full accent-[#36B37E]"
              data-testid="radius-slider"
            />
          </div>
        </div>

        {/* Job Expectations */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#8B95A5]">
            Job Expectations
          </label>
          <textarea
            value={formData.job_expectations}
            onChange={(e) => handleChange('job_expectations', e.target.value)}
            placeholder="What will the candidate actually do all day? E.g., 'Deliver food orders within 5km radius, maintain vehicle cleanliness, handle cash payments...'"
            rows={4}
            className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-[#8B95A5]/50 resize-none"
            data-testid="job-expectations-input"
          />
        </div>

        {/* Employer Location */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#8B95A5]">
            Your Business Location
          </label>
          <input
            type="text"
            value={formData.employer_location}
            onChange={(e) => handleChange('employer_location', e.target.value)}
            placeholder="e.g., Connaught Place, Delhi or Koramangala, Bangalore"
            className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-4 py-4 text-white placeholder-[#8B95A5]/50 focus:border-[#0052CC] transition-all"
            data-testid="employer-location-input"
          />
          <p className="text-xs text-[#8B95A5]">This will be shown to candidates for commute planning</p>
        </div>

        {/* Preview Card */}
        <div className="bg-gradient-to-br from-[#0052CC]/20 to-[#36B37E]/10 border border-[#0052CC]/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            <span className="text-[#0052CC] text-sm font-medium">Job Preview</span>
          </div>
          <h3 className="text-white font-bold text-lg mb-2">
            {formData.title || 'Your Job Title'}
          </h3>
          <div className="flex flex-wrap gap-2 text-sm mb-3">
            {formData.category && (
              <span className="bg-[#0052CC]/30 text-[#0052CC] px-2 py-1 rounded-full">
                {formData.category}
              </span>
            )}
            {(formData.salary_fixed || (formData.salary_min && formData.salary_max)) && (
              <span className="bg-[#36B37E]/20 text-[#36B37E] px-2 py-1 rounded-full">
                {formData.salary_type === 'fixed' 
                  ? `₹${parseInt(formData.salary_fixed || 0).toLocaleString()}/mo`
                  : `₹${parseInt(formData.salary_min || 0).toLocaleString()}-${parseInt(formData.salary_max || 0).toLocaleString()}/mo`
                }
              </span>
            )}
            <span className="bg-[#8B95A5]/20 text-[#8B95A5] px-2 py-1 rounded-full">
              {formData.required_experience === 0 ? 'Fresher OK' : `${formData.required_experience}+ yrs`}
            </span>
          </div>
          {formData.perks.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {formData.perks.map(perkId => {
                const perk = PERKS_OPTIONS.find(p => p.id === perkId);
                return perk ? (
                  <span key={perkId} className="text-xs text-[#8B95A5]">
                    {perk.icon} {perk.label}
                  </span>
                ) : null;
              })}
            </div>
          )}
          {formData.training_provided && (
            <span className="text-xs text-[#36B37E]">✓ Training provided</span>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#0052CC] to-[#36B37E] hover:opacity-90 disabled:opacity-50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
          data-testid="post-job-btn"
        >
          {loading ? (
            <>
              <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
              </svg>
              Posting Job...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
              Post Job & Find Candidates
            </>
          )}
        </button>
      </form>
    </div>
  );
}
