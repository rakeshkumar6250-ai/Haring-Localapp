'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const { login, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1); // 1: details, 2: OTP
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (!phone.trim() || !companyName.trim() || !password) {
      setError('All fields are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/nextapi/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), company_name: companyName.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Signup failed');
        return;
      }
      setVerifiedPhone(data.phone);
      setStep(2);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/nextapi/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: verifiedPhone, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Verification failed');
        return;
      }
      login(data.token, data.employer);
      router.replace('/hire');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0052CC] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pb-24">
      <div className="w-full max-w-md">
        {step === 1 ? (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2" data-testid="signup-title">Create Employer Account</h1>
              <p className="text-[#8B95A5]">Start hiring verified local talent</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#8B95A5] mb-1.5">Company / Business Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sharma Traders"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#0052CC]"
                  data-testid="signup-company"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8B95A5] mb-1.5">Phone Number</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-[#1E2740] border border-r-0 border-white/10 rounded-l-xl text-[#8B95A5] text-sm">+91</span>
                  <input
                    type="tel"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 bg-[#151B2D] border border-white/10 rounded-r-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#0052CC]"
                    data-testid="signup-phone"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8B95A5] mb-1.5">Password</label>
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#0052CC]"
                  data-testid="signup-password"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm" data-testid="signup-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0052CC] hover:bg-[#003d99] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
                data-testid="signup-submit"
              >
                {loading ? (
                  <><svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20"/></svg>Sending OTP...</>
                ) : 'Send OTP & Verify'}
              </button>
            </form>

            <p className="text-center text-[#8B95A5] text-sm mt-6">
              Already have an account?{' '}
              <Link href="/login" className="text-[#0052CC] font-medium hover:underline" data-testid="goto-login">
                Sign In
              </Link>
            </p>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#0052CC]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2" data-testid="otp-title">Verify Your Phone</h1>
              <p className="text-[#8B95A5]">
                Enter the 6-digit code sent to <span className="text-white font-medium">{verifiedPhone}</span>
              </p>
              <div className="mt-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 inline-block">
                <p className="text-amber-400 text-xs font-medium" data-testid="otp-hint">Mock Mode: Use OTP 123456</p>
              </div>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#8B95A5] mb-1.5">Enter OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="1 2 3 4 5 6"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-4 py-4 text-white text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:border-[#0052CC]"
                  data-testid="otp-input"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm" data-testid="otp-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-[#36B37E] hover:bg-[#2d9a6a] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
                data-testid="otp-submit"
              >
                {loading ? (
                  <><svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20"/></svg>Verifying...</>
                ) : 'Verify & Create Account'}
              </button>

              <button
                type="button"
                onClick={() => { setStep(1); setOtp(''); setError(''); }}
                className="w-full text-[#8B95A5] text-sm hover:text-white transition-all py-2"
                data-testid="back-to-signup"
              >
                Back to signup
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
