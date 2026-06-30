'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UsageSnapshot, PlanType } from '@/lib/types';
import { api, trackClientEvent } from '@/lib/api';
import { useRouter } from 'next/navigation';

const PLUS_PLANS: PlanType[] = ['plus', 'pro', 'premium'];
const PRO_PLANS: PlanType[] = ['pro', 'premium'];

interface AuthContextValue {
  user: User | null;
  usage: UsageSnapshot | null;
  loading: boolean;
  isAuthenticated: boolean;
  isPlus: boolean;
  isPro: boolean;
  isPremium: boolean;
  isOnTrial: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshUsage: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUsage = useCallback(async () => {
    try {
      const res = await api.getUsage();
      setUsage(res.usage);
    } catch {
      // ignore if not authenticated
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        setUsage(null);
        setLoading(false);
        return;
      }
      const res = await api.getMe();
      setUser(res.user);
      if (res.usage) setUsage(res.usage);
      else await refreshUsage();
    } catch {
      localStorage.removeItem('token');
      setUser(null);
      setUsage(null);
    } finally {
      setLoading(false);
    }
  }, [refreshUsage]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    localStorage.setItem('token', res.token);
    setUser(res.user);
    trackClientEvent('user_logged_in');
    await refreshUsage();
    router.push('/dashboard');
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.register(name, email, password);
    localStorage.setItem('token', res.token);
    setUser(res.user);
    trackClientEvent('user_registered');
    await refreshUsage();
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setUsage(null);
    router.push('/');
  };

  const plan = user?.subscription?.plan || 'free';
  const isPlus = PLUS_PLANS.includes(plan);
  const isPro = PRO_PLANS.includes(plan);
  const isOnTrial = user?.subscription?.status === 'trialing';

  return (
    <AuthContext.Provider
      value={{
        user,
        usage,
        loading,
        isAuthenticated: !!user,
        isPlus,
        isPro,
        isPremium: isPlus,
        isOnTrial,
        login,
        register,
        logout,
        refreshUser,
        refreshUsage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
