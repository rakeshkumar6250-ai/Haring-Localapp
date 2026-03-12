'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading: authLoading } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!phone.trim() || !password) {
      setError('Please enter your phone number and password');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/nextapi/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2" data-testid="login-title">Employer Login</h1>
          <p className="text-[#8B95A5]">Sign in to manage your hiring dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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
                data-testid="login-phone"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#8B95A5] mb-1.5">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#151B2D] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#0052CC]"
              data-testid="login-password"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm" data-testid="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0052CC] hover:bg-[#003d99] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
            data-testid="login-submit"
          >
            {loading ? (
              <><svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20"/></svg>Signing in...</>
            ) : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-[#8B95A5] text-sm mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[#0052CC] font-medium hover:underline" data-testid="goto-signup">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}
