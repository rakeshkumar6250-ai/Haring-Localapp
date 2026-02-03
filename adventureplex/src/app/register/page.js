'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPhoneDisplay = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(raw);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!name.trim()) {
      setError('Please enter your name');
      setLoading(false);
      return;
    }

    if (phone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          if (data.existingId) {
            // User already exists, redirect to their pass
            router.push(`/pass/${data.existingId}`);
            return;
          }
          // Show specific duplicate message
          throw new Error(data.error || 'This phone number is already registered');
        }
        // Show the actual error message from API
        throw new Error(data.error || `Registration failed (Status: ${res.status})`);
      }

      // Success - redirect to digital pass
      router.push(`/pass/${data.user.id}`);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="text-slate-400 hover:text-white mb-8 inline-block" data-testid="back-home-link">
          ← Back
        </Link>
        
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-700/50">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Join AdventurePlex</h1>
            <p className="text-slate-400">Get your digital loyalty card</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                data-testid="name-input"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formatPhoneDisplay(phone)}
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                data-testid="phone-input"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 text-red-400 text-sm" data-testid="error-message">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl text-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-emerald-600/30"
              data-testid="register-submit-btn"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Your Pass...
                </span>
              ) : (
                'Get My Digital Pass'
              )}
            </button>
          </form>

          <p className="text-center text-slate-500 text-xs mt-6">
            Collect 10 stamps to earn a FREE reward!
          </p>
        </div>
      </div>
    </main>
  );
}
