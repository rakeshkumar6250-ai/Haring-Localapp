'use client';

import { useState } from 'react';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState('initial'); // initial, form, success
  const [formData, setFormData] = useState({
    phone: '',
    issue: '',
    userType: 'candidate'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (requestCallback = false) => {
    if (!formData.phone || !formData.issue) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/nextapi/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_type: formData.userType,
          phone_number: formData.phone,
          issue_description: formData.issue,
          requires_call: requestCallback
        }),
      });

      if (res.ok) {
        setPhase('success');
      } else {
        alert('Failed to submit. Please try again.');
      }
    } catch (err) {
      console.error('Support ticket error:', err);
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setPhase('initial');
    setFormData({ phone: '', issue: '', userType: 'candidate' });
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 w-14 h-14 bg-[#0052CC] rounded-full shadow-lg flex items-center justify-center hover:bg-[#003d99] transition-all active:scale-95"
        data-testid="chat-widget-btn"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 w-80 bg-[#151B2D] rounded-2xl shadow-2xl border border-white/10 overflow-hidden" data-testid="chat-widget">
      {/* Header */}
      <div className="bg-[#0052CC] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <span className="text-white font-medium">GetLocal Support</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-all"
          data-testid="close-chat-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {phase === 'initial' && (
          <div className="space-y-4">
            <div className="bg-[#0052CC]/10 rounded-xl p-3">
              <p className="text-white text-sm">Hi! 👋 How can we help you today?</p>
            </div>

            {/* User Type Selection */}
            <div>
              <p className="text-[#8B95A5] text-xs mb-2">I am a:</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setFormData(p => ({ ...p, userType: 'candidate' }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.userType === 'candidate' 
                      ? 'bg-[#0052CC] text-white' 
                      : 'bg-[#0A0F1C] text-[#8B95A5]'
                  }`}
                >
                  Job Seeker
                </button>
                <button
                  onClick={() => setFormData(p => ({ ...p, userType: 'employer' }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.userType === 'employer' 
                      ? 'bg-[#0052CC] text-white' 
                      : 'bg-[#0A0F1C] text-[#8B95A5]'
                  }`}
                >
                  Employer
                </button>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="text-[#8B95A5] text-xs mb-1 block">Your Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                placeholder="+91 98765 43210"
                className="w-full bg-[#0A0F1C] border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                data-testid="support-phone-input"
              />
            </div>

            {/* Issue */}
            <div>
              <label className="text-[#8B95A5] text-xs mb-1 block">Describe your issue</label>
              <textarea
                value={formData.issue}
                onChange={(e) => setFormData(p => ({ ...p, issue: e.target.value }))}
                placeholder="Tell us what's wrong..."
                rows={3}
                className="w-full bg-[#0A0F1C] border border-white/10 rounded-xl px-4 py-3 text-white text-sm resize-none"
                data-testid="support-issue-input"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="w-full bg-[#0052CC] text-white font-medium py-3 rounded-xl transition-all hover:bg-[#003d99] disabled:opacity-50"
              data-testid="submit-ticket-btn"
            >
              {loading ? 'Submitting...' : 'Submit Issue'}
            </button>

            {/* Agent Callback Button */}
            <button
              onClick={() => handleSubmit(true)}
              disabled={loading || !formData.phone}
              className="w-full bg-[#36B37E] text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-[#2d9a6a] disabled:opacity-50"
              data-testid="agent-callback-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              Agent Call Back
            </button>
          </div>
        )}

        {phase === 'success' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-[#36B37E] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Request Received!</h3>
            <p className="text-[#8B95A5] text-sm mb-4">
              We&apos;ll get back to you shortly.
            </p>
            <button
              onClick={resetChat}
              className="bg-[#151B2D] border border-white/10 text-white px-6 py-2 rounded-xl text-sm hover:bg-[#1E2740]"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
