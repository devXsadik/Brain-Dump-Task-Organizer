'use client';

import Link from 'next/link';
import { Brain, Calendar, Mic, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { TIER_FEATURES, type TierIcon } from './planData';
import { cn } from '@/lib/utils';

const PLAN_BADGE: Record<string, string> = {
  free: 'Free',
  plus: 'Plus',
  pro: 'Pro',
};

const TIER_ICONS: Record<TierIcon, React.ComponentType<{ className?: string }>> = {
  brain: Brain,
  sparkles: Sparkles,
  calendar: Calendar,
  mic: Mic,
};

export function WhatYouGetSection() {
  return (
    <section className="pt-10 pb-8 md:pt-12 md:pb-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-xl mb-8"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent mb-2">
            What you get
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight">
            Core features, unlocked by plan
          </h2>
          <p className="mt-3 text-sm text-text-secondary leading-relaxed">
            See which capabilities come with each tier before you upgrade.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-4">
          {TIER_FEATURES.map((f, i) => {
            const Icon = TIER_ICONS[f.icon];
            return (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border-default bg-bg-card/40 p-5 hover:border-border-active/60 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <Icon className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {f.plans.map((p) => (
                    <span
                      key={p}
                      className={cn(
                        'text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border',
                        p === 'pro'
                          ? 'bg-accent/10 text-accent border-accent/25'
                          : p === 'plus'
                            ? 'bg-category-week/10 text-category-week border-category-week/25'
                            : 'bg-bg-secondary text-text-tertiary border-border-default'
                      )}
                    >
                      {PLAN_BADGE[p]}
                    </span>
                  ))}
                </div>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-text-primary">{f.title}</h3>
              <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">{f.desc}</p>
            </motion.div>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="#compare-plans"
            className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
          >
            See full plan comparison →
          </Link>
        </div>
      </div>
    </section>
  );
}
