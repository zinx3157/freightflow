'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@/lib/types';
import { getCurrentUser, login as doLogin, logout as doLogout, ROLE_LABEL, PERMISSIONS } from '@/lib/auth';

interface AuthCtx {
  user: User | null;
  login: (userId: string) => void;
  logout: () => void;
  can: (action: keyof typeof PERMISSIONS['admin']) => boolean;
  ready: boolean;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
    setReady(true);
    const onChange = () => setUser(getCurrentUser());
    window.addEventListener('ff:auth-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('ff:auth-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const value: AuthCtx = {
    user,
    ready,
    login: (userId) => {
      const u = doLogin(userId);
      setUser(u);
    },
    logout: () => {
      doLogout();
      setUser(null);
    },
    can: (action) => (user ? (PERMISSIONS as any)[user.role]?.[action] === true : false),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

export function roleLabel(role?: User['role'] | null) {
  if (!role) return '';
  return ROLE_LABEL[role];
}
