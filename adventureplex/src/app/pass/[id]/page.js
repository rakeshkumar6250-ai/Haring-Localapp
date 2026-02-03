'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamic import QRCode to avoid SSR issues
const QRCode = dynamic(() => import('react-qr-code').then(mod => mod.default), {
  ssr: false,
  loading: () => <div className="w-40 h-40 bg-slate-200 animate-pulse rounded" />
});

export default function PassPage() {
  const params = useParams();
  const id = params.id;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Pass not found');
          return;
        }
        throw new Error('Failed to fetch pass');
      }
      const data = await res.json();
      setUser(data);
      setLastUpdate(new Date());
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Initial fetch
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Polling every 3 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(fetchUser, 3000);
    return () => clearInterval(interval);
  }, [fetchUser]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading your pass...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-red-400 text-xl mb-4">{error}</div>
        <Link href="/register" className="text-emerald-400 hover:underline">
          Register for a new pass
        </Link>
      </main>
    );
  }

  const stamps = user?.currentStamps || 0;
  const isRewardReady = stamps >= 10;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 py-8">
      {/* Digital Wallet Card */}
      <div 
        className={`w-full max-w-sm bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700/50 ${isRewardReady ? 'card-glow' : ''}`}
        data-testid="digital-pass-card"
      >
        {/* Card Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-white font-bold text-xl tracking-tight">AdventurePlex</h1>
              <p className="text-emerald-200 text-sm">Loyalty Pass</p>
            </div>
            <div className="bg-white/20 rounded-full px-3 py-1">
              <span className="text-white text-xs font-medium">MEMBER</span>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-6">
          {/* User Info */}
          <div className="text-center">
            <h2 className="text-white text-2xl font-bold" data-testid="user-name">{user?.name}</h2>
            <p className="text-slate-400 text-sm">Member since {new Date(user?.joinDate).toLocaleDateString()}</p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-2xl shadow-lg" data-testid="qr-code-container">
              <QRCode 
                value={id} 
                size={160}
                level="H"
                data-testid="user-qr-code"
              />
            </div>
          </div>

          {/* Stamp Progress */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Your Progress</span>
              <span className="text-emerald-400 font-bold" data-testid="stamp-count">{stamps}/10</span>
            </div>
            
            {/* Stamp Circles */}
            <div className="grid grid-cols-5 gap-3" data-testid="stamp-grid">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-full flex items-center justify-center transition-all duration-300 ${
                    i < stamps
                      ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50'
                      : 'bg-slate-700/50 border-2 border-dashed border-slate-600'
                  }`}
                  data-testid={`stamp-${i + 1}`}
                >
                  {i < stamps && (
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Reward Status */}
          {isRewardReady ? (
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 rounded-2xl p-4 text-center" data-testid="reward-ready-banner">
              <div className="text-3xl mb-2">🎉</div>
              <h3 className="text-amber-400 font-bold text-lg">REWARD READY!</h3>
              <p className="text-amber-200/80 text-sm">Show this to staff to claim your free reward</p>
            </div>
          ) : (
            <div className="bg-slate-700/30 rounded-2xl p-4 text-center">
              <p className="text-slate-400 text-sm">
                {10 - stamps} more visit{10 - stamps !== 1 ? 's' : ''} until your FREE reward!
              </p>
            </div>
          )}
        </div>

        {/* Card Footer */}
        <div className="bg-slate-900/50 px-6 py-3 border-t border-slate-700/50">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>ID: {id.slice(0, 8)}...</span>
            <span>Lifetime visits: {user?.lifetimeVisits || 0}</span>
          </div>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="mt-4 text-slate-500 text-xs flex items-center gap-2">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
        Live updating • Last sync: {lastUpdate?.toLocaleTimeString()}
      </div>

      {/* Home Link */}
      <Link 
        href="/" 
        className="mt-6 text-slate-400 hover:text-white text-sm transition-colors"
        data-testid="back-home-link"
      >
        ← Back to Home
      </Link>
    </main>
  );
}
