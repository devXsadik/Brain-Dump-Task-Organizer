'use client';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { TaskProvider } from '@/context/TaskContext';
import { Toaster } from 'sonner';
import Link from 'next/link';
import { Brain, LogOut, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAlarms } from '@/hooks/useAlarms';

function GlobalAlarms() {
  useAlarms();
  return null;
}

function Header() {
  const { user, isAuthenticated, isPlus, isPro, logout } = useAuth();

  const handlePortal = async () => {
    try {
      const res = await api.createPortal();
      window.location.href = res.url;
    } catch (err: any) {
      toast.error(err.message || 'Failed to open billing portal');
    }
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-bg-primary/80 border-b border-border-default/50 w-full transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent to-category-today hover:opacity-80 transition-opacity flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/20">
            <Brain className="w-4 h-4 text-accent" />
          </div>
          Brain-Dump
        </Link>

        <nav className="flex items-center gap-5">
          {isAuthenticated ? (
            <>
              <Link href="/dashboard" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                Dashboard
              </Link>
              {!isPlus && (
                <Link href="/pricing" className="text-sm text-accent hover:text-accent-hover font-medium transition-colors">
                  Upgrade
                </Link>
              )}
              {isPlus && (
                <button onClick={handlePortal} className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" /> Billing
                </button>
              )}
              <div className="flex items-center gap-4 pl-4 ml-2 border-l border-border-default/50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-bg-card flex items-center justify-center border border-border-default text-xs font-bold text-text-secondary">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm font-medium text-text-primary hidden sm:block">{user?.name}</span>
                </div>
                {(isPlus || isPro) && (
                  <span className="px-2 py-0.5 bg-accent/10 border border-accent/20 rounded-full text-[10px] font-bold text-accent">
                    {isPro ? 'PRO' : 'PLUS'}
                  </span>
                )}
                <button onClick={logout} className="p-1.5 text-text-tertiary hover:text-priority-urgent transition-colors rounded-lg hover:bg-bg-card" title="Logout">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/pricing" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                Pricing
              </Link>
              <Link href="/login" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                Login
              </Link>
              <Link href="/register" className="px-5 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-all shadow-[0_0_15px_var(--accent-glow)]">
                Get Started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TaskProvider>
        <GlobalAlarms />
        <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-bg-secondary/40 via-bg-primary to-bg-primary">
          <Header />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            {children}
          </main>
        </div>
        <Toaster theme="dark" position="bottom-right" className="!font-sans" />
      </TaskProvider>
    </AuthProvider>
  );
}
