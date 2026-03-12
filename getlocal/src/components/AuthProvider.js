'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext(null);

// Routes that require authentication
const PROTECTED_ROUTES = ['/hire', '/post-job'];
// Routes that are only for guests (redirect to /hire if logged in)
const GUEST_ROUTES = ['/login', '/signup'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Load token from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('auth_token');
    if (stored) {
      setToken(stored);
      fetchMe(stored);
    } else {
      setLoading(false);
    }
  }, []);

  // Route protection
  useEffect(() => {
    if (loading) return;

    const isProtected = PROTECTED_ROUTES.some(r => pathname.startsWith(r));
    const isGuest = GUEST_ROUTES.some(r => pathname === r);

    if (isProtected && !user) {
      router.replace('/login');
    } else if (isGuest && user) {
      router.replace('/hire');
    }
  }, [loading, user, pathname, router]);

  const fetchMe = async (jwt) => {
    try {
      const res = await fetch('/nextapi/auth/me', {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.employer);
        setToken(jwt);
      } else {
        // Invalid token, clear it
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
      }
    } catch {
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback((jwt, employer) => {
    localStorage.setItem('auth_token', jwt);
    // Also set employer_id for backward compat with existing code
    localStorage.setItem('employer_id', employer.id);
    setToken(jwt);
    setUser(employer);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('employer_id');
    setToken(null);
    setUser(null);
    router.replace('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
