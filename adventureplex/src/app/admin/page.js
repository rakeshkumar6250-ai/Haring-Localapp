'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/analytics');
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const data = await res.json();
      setStats(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-slate-400">AdventurePlex Loyalty Analytics</p>
          </div>
          <Link 
            href="/" 
            className="text-slate-400 hover:text-white transition-colors"
            data-testid="back-home-link"
          >
            ← Back to Home
          </Link>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-400 mb-6" data-testid="error-message">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Customers */}
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700/50" data-testid="stat-total-customers">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Customers</p>
                <p className="text-4xl font-bold text-white mt-1">{stats?.totalCustomers || 0}</p>
              </div>
              <div className="w-14 h-14 bg-emerald-600/20 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Stamps Today */}
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700/50" data-testid="stat-stamps-today">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Stamps Given Today</p>
                <p className="text-4xl font-bold text-white mt-1">{stats?.stampsToday || 0}</p>
              </div>
              <div className="w-14 h-14 bg-blue-600/20 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Redemptions */}
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700/50" data-testid="stat-total-redemptions">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Redemptions</p>
                <p className="text-4xl font-bold text-white mt-1">{stats?.totalRedemptions || 0}</p>
              </div>
              <div className="w-14 h-14 bg-amber-600/20 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Active Users */}
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700/50" data-testid="stat-active-users">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Active Users</p>
                <p className="text-4xl font-bold text-white mt-1">{stats?.activeUsers || 0}</p>
                <p className="text-slate-500 text-xs mt-1">Users with stamps</p>
              </div>
              <div className="w-14 h-14 bg-purple-600/20 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          {/* Ready to Redeem */}
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700/50" data-testid="stat-ready-to-redeem">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Ready to Redeem</p>
                <p className="text-4xl font-bold text-white mt-1">{stats?.readyToRedeem || 0}</p>
                <p className="text-slate-500 text-xs mt-1">Users with 10 stamps</p>
              </div>
              <div className="w-14 h-14 bg-orange-600/20 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
            </div>
          </div>

          {/* Redemptions Today */}
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700/50" data-testid="stat-redemptions-today">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Redemptions Today</p>
                <p className="text-4xl font-bold text-white mt-1">{stats?.redemptionsToday || 0}</p>
              </div>
              <div className="w-14 h-14 bg-rose-600/20 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700/50" data-testid="recent-activity">
          <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
          
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {stats.recentActivity.map((activity) => (
                <div 
                  key={activity.id}
                  className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.type === 'EARN' 
                        ? 'bg-emerald-600/20 text-emerald-400'
                        : 'bg-amber-600/20 text-amber-400'
                    }`}>
                      {activity.type === 'EARN' ? '+1' : '🎁'}
                    </div>
                    <div>
                      <p className="text-white font-medium">{activity.userName}</p>
                      <p className="text-slate-400 text-sm">
                        {activity.type === 'EARN' ? 'Earned a stamp' : 'Redeemed reward'}
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-500 text-sm">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No recent activity</p>
          )}
        </div>

        {/* Auto-refresh indicator */}
        <div className="mt-6 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          Auto-refreshing every 10 seconds
        </div>
      </div>
    </main>
  );
}
