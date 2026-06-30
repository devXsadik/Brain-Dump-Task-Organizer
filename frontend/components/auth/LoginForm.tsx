'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-text-primary">Welcome back</h2>
        <p className="mt-2 text-text-secondary">Sign in to your Brain-Dump account</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-bg-secondary border border-border-default rounded-xl p-8 space-y-6 shadow-xl">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-bg-primary text-text-primary border border-border-default rounded-lg px-4 py-3 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg-primary text-text-primary border border-border-default rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover disabled:bg-bg-card disabled:text-text-tertiary text-white rounded-lg font-medium transition-all shadow-[0_0_15px_var(--accent-glow)] disabled:shadow-none"
        >
          <LogIn className="w-5 h-5" />
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <p className="text-center text-sm text-text-secondary">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-accent hover:text-accent-hover font-medium transition-colors">
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}
