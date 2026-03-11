'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const JOB_CATEGORIES = [
  'Driver', 'Cook', 'Delivery', 'Security Guard', 'House Helper',
  'Electrician', 'Plumber', 'Carpenter', 'Cleaner', 'Cashier', 'General'
];

const PERKS_OPTIONS = [
  { id: 'meals', label: 'Free Meals', icon: '🍽' },
  { id: 'accommodation', label: 'Accommodation', icon: '🏠' },
  { id: 'pf_esi', label: 'PF/ESI', icon: '🏥' },
  { id: 'transport', label: 'Transport', icon: '🚌' },
  { id: 'uniform', label: 'Uniform', icon: '👔' },
  { id: 'bonus', label: 'Bonus', icon: '💰' },
];

const JOB_TYPES = ['Full Time', 'Part Time', 'Both'];
const WORK_LOCATIONS = ['Office', 'Home', 'Field'];
const PAY_TYPES = ['Fixed', 'Fixed+Incentive', 'Incentive Only'];
const EDUCATION_LEVELS = ['No Requirement', '8th Pass', '10th Pass', '12th Pass', 'Graduate', 'Any'];
const ENGLISH_LEVELS = ['Not Required', 'Basic', 'Conversational', 'Fluent'];
const EXPERIENCE_OPTIONS = ['Fresher', '0-1 Year', '1-3 Years', '3-5 Years', '5+ Years'];
const CONTACT_PREFS = ['WhatsApp', 'Phone Call', 'Walk-in Only', 'Any'];

export default function PostJobPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState(null);

  // KYC state
  const [employerId, setEmployerId] = useState(null);
  const [employer, setEmployer] = useState(null);
  const [kycLoading, setKycLoading] = useState(true);
  const [showKycGate, setShowKycGate] = useState(false);
  const [kycFile, setKycFile] = useState(null);
  const [kycUploading, setKycUploading] = useState(false);
  const [kycCompanyName, setKycCompanyName] = useState('');

  const [formData, setFormData] = useState({
    company_name: '',
    title: '',
    category: '',
    job_type: 'Full Time',
    work_location_type: 'Office',
    employer_location: '',
    pay_type: 'Fixed',
    salary_type: 'fixed',
    salary_fixed: '',
    salary_min: '',
    salary_max: '',
    perks: [],
    requires_joining_fee: false,
    minimum_education: 'No Requirement',
    english_level: 'Not Required',
    experience_required: 'Fresher',
    job_description: '',
    training_provided: false,
    is_walk_in: false,
    contact_preference: 'WhatsApp',
  });

  useEffect(() => {
    // Get or create employer ID from localStorage
    let eid = localStorage.getItem('employer_id');
    if (!eid) {
      eid = crypto.randomUUID();
      localStorage.setItem('employer_id', eid);
    }
    setEmployerId(eid);
    checkEmployerKyc(eid);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: 28.6139, lng: 77.2090 })
      );
    } else {
      setUserLocation({ lat: 28.6139, lng: 77.2090 });
    }
  }, []);

  const checkEmployerKyc = async (eid) => {
    try {
      const res = await fetch(`/nextapi/employers?id=${eid}`);
      if (res.ok) {
        const data = await res.json();
        setEmployer(data.employer);
        if (data.employer) {
          setFormData(prev => ({ ...prev, company_name: data.employer.company_name || '' }));
        }
        // Show KYC gate only if no employer record or Unverified with no document
        if (!data.employer || (data.employer.verification_status === 'Unverified' && !data.employer.verification_document_url)) {
          setShowKycGate(true);
        }
      } else {
        setShowKycGate(true);
      }
    } catch {
      setShowKycGate(true);
    } finally {
      setKycLoading(false);
    }
  };

  const handleKycUpload = async () => {
    if (!kycFile || !kycCompanyName.trim()) {
      setError('Please enter your business name and upload a document');
      return;
    }
    setKycUploading(true);
    setError('');

    try {
      const fd = new FormData();
      fd.append('document', kycFile);
      fd.append('employer_id', employerId);
      fd.append('company_name', kycCompanyName.trim());

      const res = await fetch('/nextapi/employers/upload-kyc', { method: 'POST', body: fd });
      const data = await res.json();

      if (res.ok) {
        setEmployer({ ...employer, verification_status: 'Pending', company_name: kycCompanyName.trim() });
        setFormData(prev => ({ ...prev, company_name: kycCompanyName.trim() }));
        setShowKycGate(false);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch {
      setError('Network error during upload');
    } finally {
      setKycUploading(false);
    }
  };

  const handleSkipKyc = async () => {
    // Create employer record without KYC
    if (!kycCompanyName.trim()) {
      setError('Please enter your business name');
      return;
    }
    try {
      await fetch('/nextapi/employers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employer_id: employerId, company_name: kycCompanyName.trim() })
      });
      setEmployer({ _id: employerId, verification_status: 'Unverified', company_name: kycCompanyName.trim() });
      setFormData(prev => ({ ...prev, company_name: kycCompanyName.trim() }));
      setShowKycGate(false);
    } catch {
      setShowKycGate(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.title.trim()) { setError('Please enter a job title'); return; }
    if (!formData.category) { setError('Please select a category'); return; }

    setLoading(true);
    try {
      let salaryData = {};
      if (formData.salary_type === 'fixed' && formData.salary_fixed) {
        salaryData = { type: 'fixed', amount: parseInt(formData.salary_fixed), display: `₹${parseInt(formData.salary_fixed).toLocaleString()}/month` };
      } else if (formData.salary_type === 'range' && formData.salary_min && formData.salary_max) {
        salaryData = { type: 'range', min: parseInt(formData.salary_min), max: parseInt(formData.salary_max), display: `₹${parseInt(formData.salary_min).toLocaleString()} - ₹${parseInt(formData.salary_max).toLocaleString()}/month` };
      }

      const res = await fetch('/nextapi/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          salary: salaryData,
          employer_id: employerId,
          location: userLocation,
          required_experience: formData.experience_required === 'Fresher' ? 0 : parseInt(formData.experience_required) || 0,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/hire'), 1500);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to post job');
      }
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const togglePerk = (id) => setFormData(prev => ({ ...prev, perks: prev.perks.includes(id) ? prev.perks.filter(p => p !== id) : [...prev.perks, id] }));

  if (kycLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0F1C]">
        <div className="w-10 h-10 border-4 border-[#0052CC] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0F1C] px-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#36B37E] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Job Posted!</h2>
          <p className="text-[#8B95A5]">Redirecting to candidates...</p>
        </div>
      </div>
    );
  }

  // ─── KYC GATE ───
  if (showKycGate) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] pb-24">
        <header className="sticky top-0 z-40 bg-[#0A0F1C]/95 backdrop-blur-lg border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="w-10 h-10 bg-[#151B2D] rounded-xl flex items-center justify-center" data-testid="back-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Verify Your Business</h1>
              <p className="text-sm text-[#8B95A5]">Build trust with candidates</p>
            </div>
          </div>
        </header>

        <div className="p-4 space-y-6">
          {/* Info Card */}
          <div className="bg-gradient-to-br from-[#0052CC]/20 to-[#36B37E]/10 border border-[#0052CC]/30 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-[#0052CC]/30 rounded-xl flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2"><path d="M9 12l2 2 4-4"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
              </div>
              <div>
                <h3 className="text-white font-bold">Why verify?</h3>
                <p className="text-[#8B95A5] text-sm">Verified businesses get 3x more applicants</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-[#8B95A5]">
              <li className="flex items-center gap-2"><span className="text-[#36B37E]">&#10003;</span> Verified Business badge on all your job posts</li>
              <li className="flex items-center gap-2"><span className="text-[#36B37E]">&#10003;</span> Higher visibility in candidate search results</li>
              <li className="flex items-center gap-2"><span className="text-[#36B37E]">&#10003;</span> Builds trust with blue-collar workers</li>
            </ul>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm" data-testid="kyc-error">{error}</div>}

          {/* Company Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#8B95A5]">Business / Company Name <span className="text-red-400">*</span></label>
            <input type="text" value={kycCompanyName} onChange={(e) => setKycCompanyName(e.target.value)} placeholder="e.g., Kumar Enterprises" className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-4 py-4 text-white placeholder-[#8B95A5]/50 focus:border-[#0052CC] transition-all" data-testid="kyc-company-name" />
          </div>

          {/* Document Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#8B95A5]">Upload GST Certificate / Trade License</label>
            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${kycFile ? 'border-[#36B37E]/50 bg-[#36B37E]/5' : 'border-white/10 bg-[#151B2D] hover:border-[#0052CC]/50'}`}
              onClick={() => document.getElementById('kyc-file-input').click()}
              data-testid="kyc-upload-zone"
            >
              <input id="kyc-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => setKycFile(e.target.files?.[0] || null)} />
              {kycFile ? (
                <div>
                  <div className="w-12 h-12 bg-[#36B37E]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#36B37E" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <p className="text-[#36B37E] font-medium">{kycFile.name}</p>
                  <p className="text-[#8B95A5] text-xs mt-1">{(kycFile.size / 1024).toFixed(0)} KB</p>
                </div>
              ) : (
                <div>
                  <div className="w-12 h-12 bg-[#0052CC]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  </div>
                  <p className="text-white font-medium">Tap to upload document</p>
                  <p className="text-[#8B95A5] text-xs mt-1">PDF, JPG, PNG (max 5MB)</p>
                </div>
              )}
            </div>
          </div>

          {/* Upload Button */}
          <button onClick={handleKycUpload} disabled={kycUploading || !kycFile || !kycCompanyName.trim()} className="w-full bg-gradient-to-r from-[#0052CC] to-[#36B37E] hover:opacity-90 disabled:opacity-40 text-white font-bold py-4 rounded-xl transition-all" data-testid="kyc-submit-btn">
            {kycUploading ? 'Uploading...' : 'Submit for Verification'}
          </button>

          {/* Skip */}
          <button onClick={handleSkipKyc} className="w-full text-[#8B95A5] text-sm py-3 hover:text-white transition-all" data-testid="kyc-skip-btn">
            Skip for now (post without badge)
          </button>
        </div>
      </div>
    );
  }

  // ─── 3-STEP JOB FORM ───
  const stepTitles = ['Basic Details & Comp', 'Candidate Requirements', 'Interview Info'];

  return (
    <div className="min-h-screen bg-[#0A0F1C] pb-24">
      <header className="sticky top-0 z-40 bg-[#0A0F1C]/95 backdrop-blur-lg border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="w-10 h-10 bg-[#151B2D] rounded-xl flex items-center justify-center" data-testid="back-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Post a Job</h1>
            <p className="text-sm text-[#8B95A5]">Step {step} of 3 — {stepTitles[step - 1]}</p>
          </div>
          {/* Verification badge */}
          {employer?.verification_status === 'Verified' && (
            <span className="bg-[#36B37E]/20 text-[#36B37E] text-xs px-2 py-1 rounded-full font-medium" data-testid="employer-verified-badge">Verified</span>
          )}
          {employer?.verification_status === 'Pending' && (
            <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded-full font-medium" data-testid="employer-pending-badge">KYC Pending</span>
          )}
        </div>
        {/* Progress bar */}
        <div className="flex gap-1.5 mt-3">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all ${s <= step ? 'bg-[#0052CC]' : 'bg-white/10'}`} />
          ))}
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-5">
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm" data-testid="error-message">{error}</div>}

        {/* ── STEP 1: Basic Details & Comp ── */}
        {step === 1 && (
          <div className="space-y-5" data-testid="step-1">
            {/* Company Name */}
            <Field label="Company Name" required>
              <input type="text" value={formData.company_name} onChange={(e) => handleChange('company_name', e.target.value)} placeholder="Your business name" className="input-field" data-testid="company-name-input" />
            </Field>

            {/* Job Title */}
            <Field label="Job Title" required>
              <input type="text" value={formData.title} onChange={(e) => handleChange('title', e.target.value)} placeholder="e.g., Experienced Cook for Restaurant" className="input-field" data-testid="job-title-input" />
            </Field>

            {/* Category */}
            <Field label="Category" required>
              <div className="grid grid-cols-3 gap-2" data-testid="category-grid">
                {JOB_CATEGORIES.map(cat => (
                  <button key={cat} type="button" onClick={() => handleChange('category', cat)} className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${formData.category === cat ? 'bg-[#0052CC] text-white' : 'bg-[#151B2D] text-[#8B95A5] hover:bg-[#1E2740]'}`} data-testid={`cat-${cat.toLowerCase().replace(/\s/g, '-')}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </Field>

            {/* Job Type */}
            <Field label="Job Type">
              <ChipSelect options={JOB_TYPES} value={formData.job_type} onChange={(v) => handleChange('job_type', v)} testPrefix="job-type" />
            </Field>

            {/* Work Location Type */}
            <Field label="Work Location">
              <ChipSelect options={WORK_LOCATIONS} value={formData.work_location_type} onChange={(v) => handleChange('work_location_type', v)} testPrefix="work-loc" />
            </Field>

            {/* Employer Location */}
            <Field label="Business Address">
              <input type="text" value={formData.employer_location} onChange={(e) => handleChange('employer_location', e.target.value)} placeholder="e.g., Koramangala, Bangalore" className="input-field" data-testid="employer-location-input" />
            </Field>

            {/* Pay Type */}
            <Field label="Pay Type">
              <ChipSelect options={PAY_TYPES} value={formData.pay_type} onChange={(v) => handleChange('pay_type', v)} testPrefix="pay-type" />
            </Field>

            {/* Salary */}
            <Field label="Salary">
              <div className="flex bg-[#151B2D] rounded-xl p-1 mb-3">
                <button type="button" onClick={() => handleChange('salary_type', 'fixed')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${formData.salary_type === 'fixed' ? 'bg-[#0052CC] text-white' : 'text-[#8B95A5]'}`}>Fixed</button>
                <button type="button" onClick={() => handleChange('salary_type', 'range')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${formData.salary_type === 'range' ? 'bg-[#0052CC] text-white' : 'text-[#8B95A5]'}`}>Range</button>
              </div>
              {formData.salary_type === 'fixed' ? (
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B95A5]">₹</span>
                  <input type="number" value={formData.salary_fixed} onChange={(e) => handleChange('salary_fixed', e.target.value)} placeholder="15000" className="w-full bg-[#151B2D] border border-white/10 rounded-xl pl-8 pr-20 py-3 text-white" data-testid="salary-fixed-input" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B95A5] text-sm">/month</span>
                </div>
              ) : (
                <div className="flex gap-3 items-center">
                  <div className="relative flex-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B95A5]">₹</span><input type="number" value={formData.salary_min} onChange={(e) => handleChange('salary_min', e.target.value)} placeholder="10000" className="w-full bg-[#151B2D] border border-white/10 rounded-xl pl-7 pr-3 py-3 text-white" data-testid="salary-min-input" /></div>
                  <span className="text-[#8B95A5]">to</span>
                  <div className="relative flex-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B95A5]">₹</span><input type="number" value={formData.salary_max} onChange={(e) => handleChange('salary_max', e.target.value)} placeholder="20000" className="w-full bg-[#151B2D] border border-white/10 rounded-xl pl-7 pr-3 py-3 text-white" data-testid="salary-max-input" /></div>
                </div>
              )}
            </Field>

            {/* Perks */}
            <Field label="Perks & Benefits">
              <div className="grid grid-cols-2 gap-2">
                {PERKS_OPTIONS.map(perk => (
                  <button key={perk.id} type="button" onClick={() => togglePerk(perk.id)} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${formData.perks.includes(perk.id) ? 'bg-[#36B37E]/20 text-[#36B37E] border border-[#36B37E]/50' : 'bg-[#151B2D] text-[#8B95A5] border border-white/10'}`} data-testid={`perk-${perk.id}`}>
                    <span>{perk.icon}</span><span>{perk.label}</span>
                  </button>
                ))}
              </div>
            </Field>

            {/* Joining Fee Toggle - Critical */}
            <ToggleCard label="Is there any joining fee?" sublabel="Candidates are warned about jobs requiring fees" value={formData.requires_joining_fee} onChange={(v) => handleChange('requires_joining_fee', v)} testId="joining-fee-toggle" danger />
          </div>
        )}

        {/* ── STEP 2: Candidate Requirements ── */}
        {step === 2 && (
          <div className="space-y-5" data-testid="step-2">
            <Field label="Minimum Education">
              <ChipSelect options={EDUCATION_LEVELS} value={formData.minimum_education} onChange={(v) => handleChange('minimum_education', v)} testPrefix="edu" />
            </Field>

            <Field label="English Level">
              <ChipSelect options={ENGLISH_LEVELS} value={formData.english_level} onChange={(v) => handleChange('english_level', v)} testPrefix="eng" />
            </Field>

            <Field label="Experience Required">
              <ChipSelect options={EXPERIENCE_OPTIONS} value={formData.experience_required} onChange={(v) => handleChange('experience_required', v)} testPrefix="exp" />
            </Field>

            <ToggleCard label="Training Provided?" sublabel="Will you train freshers?" value={formData.training_provided} onChange={(v) => handleChange('training_provided', v)} testId="training-toggle" />

            <Field label="Job Description">
              <textarea value={formData.job_description} onChange={(e) => handleChange('job_description', e.target.value)} placeholder="Describe the role, daily tasks, work hours, and any special requirements..." rows={5} className="input-field resize-none" data-testid="job-description-input" />
            </Field>
          </div>
        )}

        {/* ── STEP 3: Interview Info ── */}
        {step === 3 && (
          <div className="space-y-5" data-testid="step-3">
            <ToggleCard label="Walk-in Interview?" sublabel="Candidates can directly come for interview" value={formData.is_walk_in} onChange={(v) => handleChange('is_walk_in', v)} testId="walkin-toggle" />

            <Field label="Communication Preference">
              <ChipSelect options={CONTACT_PREFS} value={formData.contact_preference} onChange={(v) => handleChange('contact_preference', v)} testPrefix="contact" />
            </Field>

            {/* Preview */}
            <div className="bg-gradient-to-br from-[#0052CC]/15 to-[#36B37E]/10 border border-[#0052CC]/30 rounded-2xl p-4">
              <p className="text-[#0052CC] text-sm font-medium mb-3 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                Job Preview
              </p>
              <h3 className="text-white font-bold text-lg mb-1">{formData.title || 'Your Job Title'}</h3>
              <p className="text-[#8B95A5] text-sm mb-2">{formData.company_name || 'Company'} · {formData.employer_location || 'Location'}</p>
              <div className="flex flex-wrap gap-2 text-xs mb-2">
                {formData.category && <span className="bg-[#0052CC]/30 text-[#0052CC] px-2 py-1 rounded-full">{formData.category}</span>}
                <span className="bg-[#151B2D] text-[#8B95A5] px-2 py-1 rounded-full">{formData.job_type}</span>
                <span className="bg-[#151B2D] text-[#8B95A5] px-2 py-1 rounded-full">{formData.work_location_type}</span>
                {formData.is_walk_in && <span className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">Walk-in</span>}
                {formData.requires_joining_fee && <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-full">Joining Fee Required</span>}
              </div>
              {formData.perks.length > 0 && (
                <div className="flex flex-wrap gap-1 text-xs text-[#8B95A5]">
                  {formData.perks.map(id => { const p = PERKS_OPTIONS.find(x => x.id === id); return p ? <span key={id}>{p.icon} {p.label}</span> : null; })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <button type="button" onClick={() => setStep(step - 1)} className="flex-1 bg-[#151B2D] text-white font-bold py-4 rounded-xl transition-all hover:bg-[#1E2740]" data-testid="prev-step-btn">
              Back
            </button>
          )}
          {step < 3 ? (
            <button type="button" onClick={() => { setError(''); setStep(step + 1); }} className="flex-1 bg-[#0052CC] hover:bg-[#003d99] text-white font-bold py-4 rounded-xl transition-all" data-testid="next-step-btn">
              Next: {stepTitles[step]}
            </button>
          ) : (
            <button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-[#0052CC] to-[#36B37E] hover:opacity-90 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2" data-testid="post-job-btn">
              {loading ? (
                <><svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20"/></svg>Posting...</>
              ) : (
                <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>Post Job</>
              )}
            </button>
          )}
        </div>
      </form>

      <style jsx>{`
        .input-field {
          width: 100%;
          background: #151B2D;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 14px 16px;
          color: white;
          transition: border-color 0.2s;
        }
        .input-field::placeholder { color: rgba(139,149,165,0.5); }
        .input-field:focus { border-color: #0052CC; outline: none; }
      `}</style>
    </div>
  );
}

// ── Reusable Components ──

function Field({ label, required, children }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[#8B95A5]">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function ChipSelect({ options, value, onChange, testPrefix }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onChange(opt)} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${value === opt ? 'bg-[#0052CC] text-white' : 'bg-[#151B2D] text-[#8B95A5] hover:bg-[#1E2740]'}`} data-testid={`${testPrefix}-${opt.toLowerCase().replace(/[\s+]/g, '-')}`}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function ToggleCard({ label, sublabel, value, onChange, testId, danger }) {
  return (
    <div className={`bg-[#151B2D] border rounded-xl p-4 ${danger && value ? 'border-red-500/50' : 'border-white/10'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium">{label}</p>
          {sublabel && <p className="text-[#8B95A5] text-sm">{sublabel}</p>}
        </div>
        <button type="button" onClick={() => onChange(!value)} className={`w-14 h-8 rounded-full transition-all ${value ? (danger ? 'bg-red-500' : 'bg-[#36B37E]') : 'bg-[#8B95A5]/30'}`} data-testid={testId}>
          <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-7' : 'translate-x-1'}`} />
        </button>
      </div>
    </div>
  );
}
