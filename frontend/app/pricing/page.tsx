'use client';

import { useAuth } from '@/context/AuthContext';
import { api, trackClientEvent } from '@/lib/api';
import { Check, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import type { BillingPeriod } from '@/lib/types';

const plans = [
  {
    id: 'free' as const,
    name: 'Free',
    monthlyPrice: '$0',
    annualPrice: '$0',
    description: 'Simple checklist to get started',
    features: [
      { text: 'Manual task creation', included: true },
      { text: '3 AI brain dumps / month', included: true },
      { text: 'Locked Kanban preview', included: true },
      { text: 'Full Kanban board', included: false },
      { text: 'Voice Assistant', included: false },
      { text: 'Google Calendar sync', included: false },
    ],
    cta: 'Current Plan',
    highlight: false,
    trial: false,
  },
  {
    id: 'plus' as const,
    name: 'Plus',
    monthlyPrice: '$6',
    annualPrice: '$58',
    description: 'AI-powered organization with Kanban',
    features: [
      { text: '100 AI dumps / month', included: true },
      { text: 'Full 3-column Kanban', included: true },
      { text: 'Priorities, tags & estimates', included: true },
      { text: 'Daily AI focus brief', included: true },
      { text: 'Drag-and-drop & editing', included: true },
      { text: 'CSV export', included: true },
      { text: 'Voice Assistant', included: false },
      { text: 'Calendar sync & alarms', included: false },
    ],
    cta: 'Get Plus',
    highlight: false,
    trial: false,
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    monthlyPrice: '$8',
    annualPrice: '$76',
    description: 'Hands-free voice control + calendar automation',
    features: [
      { text: 'Everything in Plus', included: true },
      { text: '200 AI dumps / month', included: true },
      { text: 'Voice Assistant', included: true },
      { text: 'Google Calendar sync', included: true },
      { text: 'Meeting reminders', included: true },
      { text: 'Productivity analytics', included: true },
      { text: 'Recurring tasks', included: true },
    ],
    cta: 'Start 7-day free trial',
    highlight: true,
    trial: true,
  },
];

export default function PricingPage() {
  const { isPlus, isPro, isAuthenticated } = useAuth();
  const [billing, setBilling] = useState<BillingPeriod>('monthly');

  const handleUpgrade = async (plan: 'plus' | 'pro') => {
    if (!isAuthenticated) {
      window.location.href = '/register';
      return;
    }
    try {
      trackClientEvent('upgrade_clicked', { plan, billing });
      const res = await api.createCheckout(plan, billing);
      window.location.href = res.url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout');
    }
  };

  const isActive = (id: string) => {
    if (id === 'pro' && isPro) return true;
    if (id === 'plus' && isPlus && !isPro) return true;
    if (id === 'free' && !isPlus) return true;
    return false;
  };

  return (
    <div className="max-w-6xl mx-auto py-12 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-text-primary">Simple, transparent pricing</h1>
        <p className="mt-4 text-lg text-text-secondary">Start free. Upgrade when you need AI superpowers.</p>
        <p className="mt-2 text-sm text-text-tertiary">Secure payments via Lemon Squeezy · USD · Bangladesh payouts supported</p>
        <div className="mt-6 inline-flex rounded-lg border border-border-default p-1 bg-bg-card">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${billing === 'monthly' ? 'bg-accent text-white' : 'text-text-secondary'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('annual')}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${billing === 'annual' ? 'bg-accent text-white' : 'text-text-secondary'}`}
          >
            Annual (2 mo free)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-xl p-8 border transition-all ${
              plan.highlight ? 'bg-bg-secondary border-accent shadow-[0_0_30px_var(--accent-glow)]' : 'bg-bg-secondary border-border-default'
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent text-white text-xs font-bold rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> BEST VALUE
              </div>
            )}

            <h3 className="text-xl font-bold text-text-primary">{plan.name}</h3>
            <p className="mt-1 text-sm text-text-secondary">{plan.description}</p>

            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-text-primary">
                {billing === 'monthly' ? plan.monthlyPrice : plan.annualPrice}
              </span>
              <span className="text-text-secondary">{billing === 'monthly' ? '/mo' : '/yr'}</span>
            </div>

            {plan.trial && billing === 'monthly' && (
              <p className="mt-2 text-xs text-accent font-medium">7-day free trial included</p>
            )}

            <ul className="mt-8 space-y-3">
              {plan.features.map((f) => (
                <li key={f.text} className="flex items-center gap-3 text-sm">
                  {f.included ? (
                    <Check className="w-4 h-4 text-priority-low flex-shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                  )}
                  <span className={f.included ? 'text-text-primary' : 'text-text-tertiary'}>{f.text}</span>
                </li>
              ))}
            </ul>

            {plan.id === 'free' ? (
              <div className="mt-8 w-full py-3 rounded-lg text-center bg-bg-card text-text-secondary text-sm">
                {isActive('free') ? '✓ Current Plan' : 'Always free'}
              </div>
            ) : (
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={isActive(plan.id)}
                className={`mt-8 w-full py-3 rounded-lg font-medium transition-all ${
                  isActive(plan.id)
                    ? 'bg-priority-low/20 text-priority-low cursor-default'
                    : 'bg-accent hover:bg-accent-hover text-white shadow-[0_0_15px_var(--accent-glow)]'
                }`}
              >
                {isActive(plan.id) ? '✓ Active Plan' : plan.cta}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
