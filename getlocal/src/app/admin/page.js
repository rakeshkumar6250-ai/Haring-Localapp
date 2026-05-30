"use client";
import { useState } from 'react';

// Safely render any value (string, number, or nested object) as text.
// The unified `candidates`/`jobs` collections mix web docs (location/salary
// stored as objects) with WhatsApp docs (plain strings).
function safeText(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') {
    return value.label || value.display || value.name || value.amount || '—';
  }
  return String(value);
}

export default function AdminDashboard() {
  const [data, setData] = useState({ activeChats: [], jobs: [], workers: [] });
  const [loading, setLoading] = useState(false);
  const [secretKey, setSecretKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [approvingId, setApprovingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPendingPayments = async (key) => {
    try {
      const res = await fetch(`/nextapi/admin/pending-payments?key=${key}`);
      if (res.ok) {
        const json = await res.json();
        setPendingPayments(json.pending || []);
      }
    } catch (error) {
      console.error('Error fetching pending payments', error);
    }
  };

  const approvePayment = async (employerId) => {
    setApprovingId(employerId);
    try {
      const res = await fetch(`/nextapi/admin/approve-payment/${employerId}?key=${secretKey}`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('failed');
      setPendingPayments((prev) => prev.filter((p) => p._id !== employerId));
      showToast('Payment approved — premium access granted.');
    } catch {
      showToast('Failed to approve. Please retry.');
    } finally {
      setApprovingId(null);
    }
  };

  const fetchData = async (key) => {
    setLoading(true);
    try {
      const res = await fetch(`/nextapi/admin?key=${key}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setIsAuthenticated(true);
        fetchPendingPayments(key);
      } else {
        alert("Invalid Admin Key");
      }
    } catch (error) {
      console.error("Error fetching data", error);
    }
    setLoading(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Kaam.ai Command Center</h1>
          <input 
            type="password" 
            placeholder="Enter Admin Secret Key" 
            className="w-full p-3 border rounded mb-4 text-black"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
          />
          <button 
            onClick={() => fetchData(secretKey)}
            className="w-full bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 text-black">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Kaam.ai Admin Dashboard</h1>
          <button onClick={() => fetchData(secretKey)} className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700">Refresh Data</button>
        </div>

        {loading ? (
          <p>Loading market data...</p>
        ) : (
          <div className="space-y-12">

            {/* PENDING PAYMENTS PANEL */}
            <section data-testid="pending-payments-panel">
              <h2 className="text-xl font-bold mb-4 text-amber-700 border-b pb-2">
                Pending UPI Payments ({pendingPayments.length})
              </h2>
              <div className="bg-white rounded shadow overflow-x-auto">
                {pendingPayments.length === 0 ? (
                  <p className="p-4 text-gray-500">No pending payments right now.</p>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="p-4">Company</th>
                        <th className="p-4">Phone</th>
                        <th className="p-4">Requested</th>
                        <th className="p-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingPayments.map((p) => (
                        <tr key={p._id} className="border-b hover:bg-gray-50" data-testid={`pending-row-${p._id}`}>
                          <td className="p-4 font-semibold">{safeText(p.company_name)}</td>
                          <td className="p-4 font-mono">{safeText(p.phone)}</td>
                          <td className="p-4 text-gray-500">{p.payment_requested_at ? new Date(p.payment_requested_at).toLocaleString() : '—'}</td>
                          <td className="p-4">
                            <button
                              onClick={() => approvePayment(p._id)}
                              disabled={approvingId === p._id}
                              className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700 disabled:opacity-60"
                              data-testid={`approve-btn-${p._id}`}
                            >
                              {approvingId === p._id ? 'Approving...' : 'Approve'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {/* JOBS TABLE */}
            <section>
              <h2 className="text-xl font-bold mb-4 text-blue-800 border-b pb-2">Active Employers &amp; Jobs ({data.jobs.length})</h2>
              <div className="bg-white rounded shadow overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-4">Date</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Salary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.jobs.map(job => (
                      <tr key={job._id} className="border-b hover:bg-gray-50">
                        <td className="p-4">{job.created_at ? new Date(job.created_at).toLocaleDateString() : '—'}</td>
                        <td className="p-4 font-mono">{safeText(job.employer_phone)}</td>
                        <td className="p-4 font-semibold">{safeText(job.category)}</td>
                        <td className="p-4">{safeText(job.location)}</td>
                        <td className="p-4 text-green-700">{safeText(job.salary)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* WORKERS TABLE */}
            <section>
              <h2 className="text-xl font-bold mb-4 text-green-800 border-b pb-2">Verified Talent Pool ({data.workers.length})</h2>
              <div className="bg-white rounded shadow overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-4">Name</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Expected Pay</th>
                      <th className="p-4">Voice Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.workers.map(worker => (
                      <tr key={worker._id} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-semibold">{safeText(worker.name)}</td>
                        <td className="p-4 font-mono">{safeText(worker.phone)}</td>
                        <td className="p-4 font-semibold">{safeText(worker.role_category || worker.category)}</td>
                        <td className="p-4">{safeText(worker.address || worker.location)}</td>
                        <td className="p-4 text-green-700">{safeText(worker.salary_expected || worker.salary)}</td>
                        <td className="p-4">
                          {worker.audio_interview_url ? (
                            <a
                              href={worker.audio_interview_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 underline font-bold"
                              data-testid={`worker-audio-link-${worker._id}`}
                            >
                              🎤 Listen
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* CHAT STATE TABLE (Debugging & ID Check) */}
            <section>
              <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Live AI Conversations &amp; ID Uploads ({data.activeChats.length})</h2>
              <div className="bg-white rounded shadow overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-4">Phone</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Missing Info</th>
                      <th className="p-4">Uploaded ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.activeChats.map(chat => (
                      <tr key={chat._id} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-mono">{chat.phoneNumber}</td>
                        <td className="p-4 uppercase">{chat.userType || 'Unknown'}</td>
                        <td className="p-4 text-gray-500">
                          {!chat.category && 'Category, '}
                          {!chat.location && 'Location, '}
                          {!chat.salary && 'Salary'}
                          {chat.isComplete && 'None (Processing)'}
                        </td>
                        <td className="p-4">
                          {chat.documentUrl ? (
                            <a href={chat.documentUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">View ID Image</a>
                          ) : (
                            <span className="text-red-400">No Document</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg font-medium" data-testid="admin-toast">
          {toast}
        </div>
      )}
    </div>
  );
}
