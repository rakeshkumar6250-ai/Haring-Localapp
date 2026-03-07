'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/join', icon: 'mic', label: 'Join' },
    { href: '/hire', icon: 'briefcase', label: 'Hire' },
    { href: '/admin', icon: 'wallet', label: 'Admin' },
  ];

  const isActive = (href) => {
    if (href === '/join') {
      return pathname === '/join' || pathname === '/';
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const getIcon = (icon, active) => {
    const color = active ? '#0052CC' : '#8B95A5';
    
    switch (icon) {
      case 'mic':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        );
      case 'briefcase':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        );
      case 'wallet':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-50 px-4 py-3" data-testid="bottom-nav">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all ${
                active 
                  ? 'bg-[#0052CC]/10' 
                  : 'hover:bg-white/5 active:bg-white/10'
              }`}
              data-testid={`nav-${item.icon}`}
            >
              {getIcon(item.icon, active)}
              <span className={`text-xs font-medium ${
                active ? 'text-[#0052CC]' : 'text-[#8B95A5]'
              }`}>
                {item.label}
              </span>
              {/* Active indicator dot */}
              {active && (
                <div className="absolute -bottom-1 w-1 h-1 bg-[#0052CC] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}