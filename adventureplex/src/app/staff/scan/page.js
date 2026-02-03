'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';

export default function StaffScanPage() {
  const router = useRouter();
  const [staffAuth, setStaffAuth] = useState(null);
  const [scannedUser, setScannedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [error, setError] = useState('');
  const html5QrCodeRef = useRef(null);

  // Check staff authentication
  useEffect(() => {
    const auth = sessionStorage.getItem('staffAuth');
    if (!auth) {
      router.push('/staff/login');
      return;
    }
    setStaffAuth(JSON.parse(auth));
  }, [router]);

  // Initialize scanner
  useEffect(() => {
    if (!staffAuth || scannedUser) return;

    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode('qr-reader');
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          async (decodedText) => {
            // Stop scanner on successful scan
            await html5QrCode.stop();
            handleScan(decodedText);
          },
          () => {} // Ignore errors during scanning
        );
      } catch {
        setError('Camera access denied. Please allow camera permissions.');
      }
    };

    startScanner();

    return () => {
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [staffAuth, scannedUser]);

  const handleScan = async (userId) => {
    setError('');
    try {
      const res = await fetch(`/api/user/${userId}`);
      if (!res.ok) {
        throw new Error('Invalid QR code - User not found');
      }
      const user = await res.json();
      setScannedUser(user);
    } catch (err) {
      setError(err.message);
      // Restart scanner after error
      setTimeout(() => {
        setError('');
        setScannedUser(null);
      }, 2000);
    }
  };

  const handleAddStamp = async () => {
    if (!scannedUser || actionLoading) return;
    setActionLoading(true);
    setActionResult(null);

    try {
      const res = await fetch('/api/stamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: scannedUser.id,
          staffId: staffAuth.staffId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionResult({
        type: 'stamp',
        success: true,
        message: data.message,
        newCount: data.newCount,
      });

      // Reset after 2 seconds
      setTimeout(resetScanner, 2000);
    } catch (err) {
      setActionResult({
        type: 'stamp',
        success: false,
        message: err.message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!scannedUser || actionLoading) return;
    setActionLoading(true);
    setActionResult(null);

    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: scannedUser.id,
          staffId: staffAuth.staffId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionResult({
        type: 'redeem',
        success: true,
        message: data.message,
      });

      // Reset after 2 seconds
      setTimeout(resetScanner, 2000);
    } catch (err) {
      setActionResult({
        type: 'redeem',
        success: false,
        message: err.message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const resetScanner = () => {
    setScannedUser(null);
    setActionResult(null);
    setError('');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('staffAuth');
    router.push('/staff/login');
  };

  if (!staffAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 px-4 py-3 flex justify-between items-center border-b border-slate-700">
        <div>
          <h1 className="text-white font-bold">Staff Scanner</h1>
          <p className="text-slate-400 text-xs">Logged in as {staffAuth.staffName}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-slate-400 hover:text-white text-sm"
          data-testid="logout-btn"
        >
          Logout
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 relative">
        {/* Scanner View */}
        {!scannedUser && (
          <div className="absolute inset-0 flex flex-col">
            <div id="qr-reader" className="flex-1 bg-black" data-testid="qr-scanner"></div>
            
            {/* Scanner Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-emerald-400 rounded-2xl relative">
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></div>
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></div>
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></div>
              </div>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 to-transparent p-6 pt-16">
              <p className="text-white text-center text-lg font-medium">Scan Customer QR Code</p>
              <p className="text-slate-400 text-center text-sm mt-1">Position the QR code within the frame</p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="absolute top-4 left-4 right-4 bg-red-500/90 rounded-xl p-4 text-white text-center" data-testid="scan-error">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Action Panel */}
        {scannedUser && (
          <div className="absolute inset-0 bg-slate-900 p-6 flex flex-col" data-testid="action-panel">
            {/* Customer Info */}
            <div className="bg-slate-800 rounded-2xl p-6 mb-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold text-emerald-400">
                    {scannedUser.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h2 className="text-white text-2xl font-bold" data-testid="scanned-user-name">{scannedUser.name}</h2>
                <p className="text-slate-400">Member</p>
              </div>

              {/* Stamp Count */}
              <div className="mt-6 bg-slate-700/50 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Current Stamps</span>
                  <span className="text-3xl font-bold text-emerald-400" data-testid="scanned-user-stamps">
                    {scannedUser.currentStamps}/10
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-3 h-3 bg-slate-600 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${(scannedUser.currentStamps / 10) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Action Result */}
            {actionResult && (
              <div 
                className={`rounded-2xl p-6 mb-6 text-center ${
                  actionResult.success 
                    ? 'bg-emerald-500/20 border border-emerald-500/50' 
                    : 'bg-red-500/20 border border-red-500/50'
                }`}
                data-testid="action-result"
              >
                <div className="text-4xl mb-2">
                  {actionResult.success ? '✓' : '✗'}
                </div>
                <p className={actionResult.success ? 'text-emerald-400' : 'text-red-400'}>
                  {actionResult.message}
                </p>
                {actionResult.newCount !== undefined && (
                  <p className="text-slate-400 text-sm mt-2">
                    New stamp count: {actionResult.newCount}/10
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {!actionResult && (
              <div className="flex-1 flex flex-col gap-4">
                {scannedUser.currentStamps < 10 ? (
                  <button
                    onClick={handleAddStamp}
                    disabled={actionLoading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white text-2xl font-bold rounded-2xl transition-all active:scale-98 shadow-lg shadow-emerald-600/30"
                    data-testid="add-stamp-btn"
                  >
                    {actionLoading ? 'Adding...' : '+ ADD STAMP'}
                  </button>
                ) : (
                  <button
                    onClick={handleRedeem}
                    disabled={actionLoading}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-slate-600 disabled:to-slate-600 text-white text-2xl font-bold rounded-2xl transition-all active:scale-98 shadow-lg shadow-orange-500/30"
                    data-testid="redeem-btn"
                  >
                    {actionLoading ? 'Redeeming...' : '🎁 REDEEM REWARD'}
                  </button>
                )}

                <button
                  onClick={resetScanner}
                  className="py-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all"
                  data-testid="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
