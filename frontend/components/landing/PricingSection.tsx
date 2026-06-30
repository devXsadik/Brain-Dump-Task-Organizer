'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { LANDING_PLANS } from './planData';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.4 },
};

export function PricingSection() {
  return (
    <section className="pt-8 pb-10 md:pt-10 md:pb-12 px-4 sm:px-6 border-t border-border-default/40 bg-bg-secondary/10">
      <div className="max-w-6xl mx-auto">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent mb-2">
            Pricing
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight">
            Pick the plan that fits your workflow
          </h2>
          <p className="mt-3 text-sm text-text-secondary">
            Start free. Upgrade when you need more AI dumps, full Kanban, or voice + calendar.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {LANDING_PLANS.map((tier, i) => (
            <motion.div
              key={tier.id}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.06 }}
              className={`relative flex flex-col rounded-2xl p-6 border ${
                tier.highlight
                  ? 'border-accent/40 bg-bg-card shadow-[0_0_48px_rgba(139,92,246,0.1)]'
                  : 'border-border-default bg-bg-card/30'
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-accent text-white text-[10px] font-bold uppercase tracking-wide rounded-full">
                  Most popular
                </span>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-text-primary">{tier.name}</h3>
                <p className="text-xs text-accent font-medium mt-0.5">{tier.tagline}</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-semibold text-text-primary">{tier.price}</span>
                <span className="text-text-tertiary text-sm">/mo</span>
              </div>
              {tier.annualPrice !== '$0' && (
                <p className="text-xs text-text-tertiary mt-1">
                  or {tier.annualPrice}/yr (save ~20%)
                </p>
              )}

              <p className="mt-4 text-xs text-text-secondary leading-relaxed border-l-2 border-accent/40 pl-3">
                <span className="font-semibold text-text-primary">Best for: </span>
                {tier.bestFor}
              </p>

              <ul className="mt-5 space-y-2.5 flex-1">
                {tier.highlights.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                    <Check className="w-4 h-4 text-priority-low mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {tier.trial && (
                <p className="mt-4 text-[11px] text-accent font-medium">Includes 7-day free trial</p>
              )}

              <Link
                href={tier.href}
                className={`mt-5 block text-center py-3 rounded-lg text-sm font-semibold transition-colors ${
                  tier.highlight
                    ? 'bg-accent hover:bg-accent-hover text-white'
                    : 'border border-border-default bg-bg-primary/50 hover:bg-bg-primary text-text-primary'
                }`}
              >
                {tier.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-text-tertiary mt-6">
          All paid plans billed in USD via Lemon Squeezy · Cancel anytime
        </p>
      </div>
    </section>
  );
}
