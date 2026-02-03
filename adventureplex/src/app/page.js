import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-white tracking-tight">
            Adventure<span className="text-emerald-400">Plex</span>
          </h1>
          <p className="text-slate-400 text-lg">Loyalty Rewards Program</p>
        </div>
        
        <div className="flex flex-col gap-4 w-full max-w-xs mx-auto">
          <Link 
            href="/register"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 px-8 rounded-2xl text-lg transition-all transform hover:scale-105 shadow-lg shadow-emerald-600/30"
            data-testid="join-now-btn"
          >
            Join Now
          </Link>
          
          <Link 
            href="/staff/login"
            className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-4 px-8 rounded-2xl text-lg transition-all"
            data-testid="staff-login-btn"
          >
            Staff Login
          </Link>
          
          <Link 
            href="/admin"
            className="text-slate-500 hover:text-slate-300 text-sm underline transition-colors"
            data-testid="admin-link"
          >
            Admin Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
