import Link from 'next/link';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#1E1E1E] flex flex-col p-6 pb-24">
      <div className="flex items-center gap-2 mb-8 mt-4">
        <div className="w-8 h-8 bg-[#E6F4EA] text-[#1F8A61] rounded-lg flex items-center justify-center font-bold">K</div>
        <span className="text-white text-xl font-bold tracking-tight">Kaam.ai</span>
      </div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Choose your plan</h1>
        <p className="text-[#8B95A5]">First hire always free. Subscribe to unlock unlimited.</p>
      </div>
      <div className="space-y-6">
        <div className="border border-[#1F8A61] bg-[#2A2A2A] rounded-[2rem] p-6 relative">
          <div className="absolute top-6 right-6 bg-[#E6F4EA] text-[#1F8A61] text-xs font-bold px-3 py-1 rounded-full">Most popular</div>
          <h2 className="text-white text-xl font-bold mb-2">Basic</h2>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-[#1F8A61] text-4xl font-bold">₹499</span>
            <span className="text-[#8B95A5] font-medium">/month</span>
          </div>
          <ul className="space-y-3 mb-8">
            {['Unlimited job posts', 'Access all verified workers', 'WhatsApp AI matching', 'Worker ratings & reviews'].map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-white/90 text-sm font-medium">
                <span className="text-[#1F8A61]">✓</span> {feature}
              </li>
            ))}
          </ul>
          <button className="w-full bg-[#333] hover:bg-[#444] text-white border border-white/10 font-bold py-4 rounded-xl transition-colors">Subscribe now</button>
        </div>
        <div className="border border-white/10 bg-[#2A2A2A] rounded-[2rem] p-6">
          <h2 className="text-white text-xl font-bold mb-2">Pro</h2>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-[#1F8A61] text-4xl font-bold">₹1,299</span>
            <span className="text-[#8B95A5] font-medium">/month</span>
          </div>
          <ul className="space-y-3 mb-8">
            {['Everything in Basic', 'Background verification', 'Priority matching (2hr)', 'Dedicated account manager', 'Up to 3 staff managed'].map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-white/90 text-sm font-medium">
                <span className="text-[#1F8A61]">✓</span> {feature}
              </li>
            ))}
          </ul>
          <button className="w-full bg-[#333] hover:bg-[#444] text-white border border-white/10 font-bold py-4 rounded-xl transition-colors">Upgrade to Pro</button>
        </div>
      </div>
    </div>
  );
}
