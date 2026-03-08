'use client';

import { useState, useEffect, useCallback } from 'react';

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, open, resolved, callback

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch('/nextapi/support-tickets');
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 10000);
    return () => clearInterval(interval);
  }, [fetchTickets]);

  const handleResolve = async (ticketId) => {
    try {
      const res = await fetch('/nextapi/support-tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, status: 'Resolved' }),
      });

      if (res.ok) {
        fetchTickets();
      }
    } catch (err) {
      console.error('Failed to resolve ticket:', err);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'all') return true;
    if (filter === 'open') return ticket.status === 'Open';
    if (filter === 'resolved') return ticket.status === 'Resolved';
    if (filter === 'callback') return ticket.requires_call;
    return true;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'Open').length,
    resolved: tickets.filter(t => t.status === 'Resolved').length,
    callback: tickets.filter(t => t.requires_call && t.status === 'Open').length
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0A0F1C]/95 backdrop-blur-lg border-b border-white/10 px-4 py-4">
        <h1 className="text-xl font-bold text-white">Support Dashboard</h1>
        <p className="text-sm text-[#8B95A5]">Manage customer support tickets</p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 p-4">
        <StatCard label="Total" value={stats.total} color="#8B95A5" />
        <StatCard label="Open" value={stats.open} color="#0052CC" />
        <StatCard label="Resolved" value={stats.resolved} color="#36B37E" />
        <StatCard label="Need Call" value={stats.callback} color="#FF5630" />
      </div>

      {/* Filter Tabs */}
      <div className="px-4 flex gap-2 overflow-x-auto pb-2">
        {['all', 'open', 'resolved', 'callback'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filter === f 
                ? 'bg-[#0052CC] text-white' 
                : 'bg-[#151B2D] text-[#8B95A5] hover:bg-[#1E2740]'
            }`}
          >
            {f === 'callback' ? 'Need Callback' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-[#0052CC] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#8B95A5]">Loading tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[#151B2D] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B95A5" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M9 9h6"/>
                <path d="M9 13h6"/>
                <path d="M9 17h3"/>
              </svg>
            </div>
            <p className="text-[#8B95A5]">No tickets found</p>
          </div>
        ) : (
          filteredTickets.map(ticket => (
            <TicketCard 
              key={ticket._id} 
              ticket={ticket} 
              onResolve={() => handleResolve(ticket._id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-[#151B2D] rounded-xl p-4 text-center">
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-[#8B95A5] text-xs mt-1">{label}</p>
    </div>
  );
}

function TicketCard({ ticket, onResolve }) {
  const isOpen = ticket.status === 'Open';
  const needsCall = ticket.requires_call;

  return (
    <div className={`bg-[#151B2D] rounded-2xl p-4 border ${
      needsCall && isOpen ? 'border-red-500/50' : 'border-white/5'
    }`} data-testid="ticket-card">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            isOpen ? 'bg-[#0052CC]/20 text-[#0052CC]' : 'bg-[#36B37E]/20 text-[#36B37E]'
          }`}>
            {ticket.status}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            ticket.user_type === 'employer' 
              ? 'bg-amber-500/20 text-amber-400' 
              : 'bg-[#8B95A5]/20 text-[#8B95A5]'
          }`}>
            {ticket.user_type === 'employer' ? 'Employer' : 'Candidate'}
          </span>
          {needsCall && (
            <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-full text-xs font-medium animate-pulse">
              📞 Callback Requested
            </span>
          )}
        </div>
        <span className="text-[#8B95A5] text-xs">
          {new Date(ticket.created_at).toLocaleString()}
        </span>
      </div>

      {/* Phone */}
      <div className="flex items-center gap-2 mb-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B95A5" strokeWidth="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
        <span className="text-white font-mono" data-testid="ticket-phone">{ticket.phone_number}</span>
      </div>

      {/* Issue */}
      <div className="bg-[#0A0F1C]/50 rounded-xl p-3 mb-4">
        <p className="text-[#8B95A5] text-xs mb-1">Issue:</p>
        <p className="text-white text-sm" data-testid="ticket-issue">{ticket.issue_description}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {/* Call Button - href="tel:" */}
        <a
          href={`tel:${ticket.phone_number.replace(/\s/g, '')}`}
          className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-all ${
            needsCall && isOpen
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-[#36B37E] text-white hover:bg-[#2d9a6a]'
          }`}
          data-testid="call-user-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
          Call User
        </a>

        {/* Resolve Button */}
        {isOpen && (
          <button
            onClick={onResolve}
            className="flex-1 bg-[#0052CC] hover:bg-[#003d99] text-white py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-all"
            data-testid="resolve-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Mark Resolved
          </button>
        )}
      </div>
    </div>
  );
}
