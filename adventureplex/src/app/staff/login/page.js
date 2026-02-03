'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StaffLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePinInput = (digit) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');
      
      // Auto-submit when 4 digits entered
      if (newPin.length === 4) {
        handleSubmit(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const handleSubmit = async (pinValue) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/staff/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinValue }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid PIN');
      }

      // Store staff session
      sessionStorage.setItem('staffAuth', JSON.stringify({
        staffId: data.staffId,
        staffName: data.staffName,
        timestamp: Date.now()
      }));

      // Redirect to scanner
      router.push('/staff/scan');
    } catch (err) {
      setError(err.message);
      setPin('');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-slate-400 hover:text-white mb-8 inline-block" data-testid="back-home-link">
          ← Back
        </Link>

        <div className="bg-slate-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-700/50">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Staff Login</h1>
            <p className="text-slate-400 text-sm">Enter your 4-digit PIN</p>
          </div>

          {/* PIN Display */}
          <div className="flex justify-center gap-3 mb-8" data-testid="pin-display">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all ${
                  i < pin.length
                    ? 'border-emerald-500 bg-emerald-500/20'
                    : 'border-slate-600 bg-slate-900/50'
                }`}
              >
                {i < pin.length && (
                  <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
                )}
              </div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 text-red-400 text-sm text-center mb-6" data-testid="error-message">
              {error}
            </div>
          )}

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-3" data-testid="pin-keypad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  if (item === 'del') handleDelete();
                  else if (item !== null) handlePinInput(String(item));
                }}
                disabled={loading || item === null}
                className={`h-14 rounded-xl font-semibold text-xl transition-all ${
                  item === null
                    ? 'invisible'
                    : item === 'del'
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    : 'bg-slate-700/50 hover:bg-slate-600 text-white active:scale-95'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                data-testid={item === 'del' ? 'pin-delete-btn' : item !== null ? `pin-btn-${item}` : undefined}
              >
                {item === 'del' ? (
                  <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                  </svg>
                ) : item}
              </button>
            ))}
          </div>

          {loading && (
            <div className="mt-6 text-center text-slate-400 text-sm">
              Verifying...
            </div>
          )}

          <p className="text-center text-slate-500 text-xs mt-6">
            Default PIN: 1234
          </p>
        </div>
      </div>
    </main>
  );
}
