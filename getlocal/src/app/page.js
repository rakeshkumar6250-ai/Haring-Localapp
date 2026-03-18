import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-6">
      
      {/* Brand Header */}
      <div className="mb-10 text-center animate-fade-in-down">
        <div className="w-20 h-20 bg-[#0052CC] rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_rgba(0,82,204,0.3)]">
          <span className="text-white font-bold text-4xl">G</span>
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">GetLocal</h1>
      </div>

      {/* The Two Massive Doors */}
      <div className="w-full max-w-md flex flex-col gap-6">

        {/* DOOR 1: Candidates (Supply side goes top because we need them most) */}
        <Link 
          href="/join" 
          className="relative w-full bg-[#151B2D] border-2 border-[#36B37E]/30 hover:border-[#36B37E] rounded-[2rem] p-8 flex flex-col items-center justify-center transition-all active:scale-95 shadow-lg"
        >
          <div className="w-24 h-24 bg-[#36B37E] rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(54,179,126,0.4)]">
            {/* Briefcase / Tool Icon */}
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">I Want a Job</h2>
          <p className="text-[#36B37E] font-semibold text-lg text-center">
            मुझे काम चाहिए <br/> నాకు పని కావాలి
          </p>
        </Link>

        {/* DOOR 2: Employers */}
        <Link 
          href="/login" 
          className="relative w-full bg-[#151B2D] border-2 border-[#0052CC]/30 hover:border-[#0052CC] rounded-[2rem] p-8 flex flex-col items-center justify-center transition-all active:scale-95 shadow-lg"
        >
          <div className="w-24 h-24 bg-[#0052CC] rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,82,204,0.4)]">
            {/* Hire / Person Icon */}
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">I Want to Hire</h2>
          <p className="text-[#0052CC] font-semibold text-lg text-center">
            मुझे स्टाफ चाहिए <br/> నాకు స్టాఫ్ కావాలి
          </p>
        </Link>

      </div>
    </div>
  );
}