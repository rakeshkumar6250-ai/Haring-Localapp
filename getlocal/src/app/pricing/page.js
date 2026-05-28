'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

const PACKS = [
  { credits: 10, price: 500, tag: null },
  { credits: 25, price: 1000, tag: 'Best Value' },
  { credits: 50, price: 1750, tag: 'Most Popular' },
];

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PricingPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [balance, setBalance] = useState(0);
  const [processing, setProcessing] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadWallet = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/nextapi/wallet', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance || 0);
      }
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && token) loadWallet();
  }, [authLoading, token, loadWallet]);

  const verifyAndCredit = async (payload) => {
    const res = await fetch('/nextapi/payments/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.verified) {
      throw new Error(data.error || 'Payment verification failed');
    }
    return data;
  };

  const handleBuy = async (pack) => {
    if (!user || !token) {
      router.push('/login');
      return;
    }
    setProcessing(pack.credits);
    try {
      // 1. Create order on the server
      const orderRes = await fetch('/nextapi/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ credits: pack.credits }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error || 'Could not create order');
      }

      // 2. Mock mode (keys not yet configured): credit directly
      if (orderData.mock) {
        const result = await verifyAndCredit({ credits: pack.credits, mock: true });
        setBalance(result.new_balance);
        showToast(`${pack.credits} credits added (test mode).`, 'success');
        return;
      }

      // 3. Real Razorpay Checkout
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error('Failed to load Razorpay. Check your connection.');

      const rzp = new window.Razorpay({
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Kaam.ai',
        description: `${pack.credits} unlock credits`,
        order_id: orderData.order.id,
        prefill: {
          name: user.company_name || '',
          contact: (user.phone || '').replace('+91', ''),
        },
        theme: { color: '#36B37E' },
        handler: async (response) => {
          try {
            const result = await verifyAndCredit({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              credits: pack.credits,
            });
            setBalance(result.new_balance);
            showToast(`${pack.credits} credits added successfully!`, 'success');
          } catch (err) {
            showToast(err.message, 'error');
          } finally {
            setProcessing(null);
          }
        },
        modal: {
          ondismiss: () => setProcessing(null),
        },
      });
      rzp.on('payment.failed', (resp) => {
        showToast(resp.error?.description || 'Payment failed', 'error');
        setProcessing(null);
      });
      rzp.open();
      return; // processing cleared by handler/dismiss
    } catch (err) {
      showToast(err.message || 'Something went wrong', 'error');
    } finally {
      // For mock/error paths (real checkout clears in its own callbacks)
      setProcessing((p) => (p === pack.credits ? null : p));
    }
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-6" data-testid="pricing-page">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Buy Unlock Credits</h1>
            <p className="text-[#8B95A5] text-sm mt-1">1 credit reveals 1 candidate&apos;s contact.</p>
          </div>
          <div className="flex items-center gap-2 bg-gradient-to-r from-[#D4A017] to-[#F5C518] text-[#0A0F1C] font-bold text-sm px-3.5 py-2 rounded-xl" data-testid="pricing-balance">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9" /></svg>
            {balance} credits
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {PACKS.map((pack) => {
          const perCredit = (pack.price / pack.credits).toFixed(0);
          return (
            <div
              key={pack.credits}
              className={`bg-[#151B2D] rounded-2xl p-5 border transition-all ${
                pack.tag === 'Most Popular' ? 'border-[#36B37E]/50' : 'border-white/5'
              }`}
              data-testid={`credit-pack-${pack.credits}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-white text-xl font-bold">{pack.credits} Credits</h2>
                    {pack.tag && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#36B37E]/15 text-[#36B37E] font-semibold">
                        {pack.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-[#8B95A5] text-sm mt-0.5">₹{perCredit} per unlock</p>
                </div>
                <div className="text-right">
                  <span className="text-[#36B37E] text-2xl font-bold">₹{pack.price.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <button
                onClick={() => handleBuy(pack)}
                disabled={processing !== null}
                className="w-full bg-gradient-to-r from-[#D4A017] to-[#F5C518] text-[#0A0F1C] font-bold py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                data-testid={`buy-pack-${pack.credits}`}
              >
                {processing === pack.credits ? (
                  <>
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" /></svg>
                    Processing...
                  </>
                ) : (
                  `Buy ${pack.credits} Credits`
                )}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-[#8B95A5] text-xs text-center mt-6">
        Secure payments by Razorpay. UPI, cards &amp; netbanking accepted.
      </p>

      {toast && (
        <div
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
            toast.type === 'error' ? 'bg-red-500/90 text-white' : toast.type === 'success' ? 'bg-[#36B37E] text-white' : 'bg-[#151B2D] text-white border border-white/10'
          }`}
          data-testid="pricing-toast"
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
