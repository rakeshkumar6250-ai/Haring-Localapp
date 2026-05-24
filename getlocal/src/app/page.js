import Link from 'next/link';

export default function LandingPage() {
  const categories = [
    { name: 'Drivers', icon: '🚗' },
    { name: 'Cooks', icon: '🧑‍🍳' },
    { name: 'Helpers', icon: '🧹' },
    { name: 'Teachers', icon: '👩‍🏫' },
    { name: 'Security', icon: '🔒' },
    { name: 'More', icon: '🔧' },
  ];

  return (
    <div className="min-h-screen bg-[#1E1E1E] flex flex-col pb-20">
      <div className="bg-[#1F8A61] rounded-b-[2rem] p-6 pt-12 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold">K</div>
          <span className="text-xl font-bold tracking-tight">Kaam.ai</span>
        </div>
        <h1 className="text-4xl font-bold leading-tight mb-2">Hire trusted workers near you</h1>
        <p className="text-white/80 font-medium mb-6">AI-powered · WhatsApp-first · Hyderabad</p>
        <div className="flex gap-3 mb-8">
          <span className="bg-white/20 px-4 py-1.5 rounded-full text-sm font-semibold">English</span>
          <span className="bg-white/10 px-4 py-1.5 rounded-full text-sm font-semibold">हिंदी</span>
          <span className="bg-white/10 px-4 py-1.5 rounded-full text-sm font-semibold">తెలుగు</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Link href="/join" className="border border-white/30 bg-white/10 hover:bg-white/20 rounded-2xl p-5 flex flex-col items-center justify-center transition-all active:scale-95">
            <h2 className="text-xl font-bold mb-1">నాకు పని కావాలి</h2>
            <p className="text-sm font-medium text-white/80">I want work</p>
          </Link>
          <Link href="/hire" className="border border-white/30 bg-white/10 hover:bg-white/20 rounded-2xl p-5 flex flex-col items-center justify-center transition-all active:scale-95">
            <h2 className="text-xl font-bold mb-1">నాకు స్టాఫ్ కావాలి</h2>
            <p className="text-sm font-medium text-white/80">I want to hire</p>
          </Link>
        </div>
      </div>
      <div className="p-6">
        <div className="mb-8">
          <h3 className="text-[#8B95A5] text-sm font-bold tracking-wider mb-4 uppercase">Browse by Category</h3>
          <div className="grid grid-cols-3 gap-3">
            {categories.map((cat) => (
              <button key={cat.name} className="bg-[#2A2A2A] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-[#333] transition-colors">
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-white text-xs font-semibold">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-[#8B95A5] text-sm font-bold tracking-wider mb-4 uppercase">Recently Verified</h3>
          <div className="bg-[#2A2A2A] border border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#E6F4EA] text-[#1F8A61] rounded-full flex items-center justify-center font-bold text-lg">RK</div>
              <div>
                <h4 className="text-white font-bold text-lg leading-tight">Raju Kumar</h4>
                <p className="text-[#8B95A5] text-sm mb-2">Driver · Hydershakote</p>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="bg-[#E6F4EA] text-[#1F8A61] px-2 py-1 rounded-md flex items-center gap-1">✓ Verified</span>
                  <span className="text-[#FABB05] flex items-center gap-1">★ 4.8</span>
                  <span className="text-[#8B95A5] bg-black/20 px-2 py-1 rounded-md">4 yrs exp</span>
                </div>
              </div>
            </div>
            <button className="bg-[#333] hover:bg-[#444] text-white border border-white/10 font-bold px-5 py-2 rounded-xl transition-colors">Hire</button>
          </div>
        </div>
      </div>
    </div>
  );
}
