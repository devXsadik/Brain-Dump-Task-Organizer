'use client';

import Link from 'next/link';
import { ArrowRight, Brain, Check, Quote, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { ProductPreview } from '@/components/landing/ProductPreview';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { WhatYouGetSection } from '@/components/landing/WhatYouGetSection';
import { PlanComparisonSection } from '@/components/landing/PlanComparisonSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { FaqCtaSection } from '@/components/landing/FaqCtaSection';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.4 },
};

const TESTIMONIALS = [
  {
    quote:
      'I dump everything in one place and AI sorts it. No more juggling Notes, Slack, and a todo app.',
    role: 'Product manager',
  },
  {
    quote:
      'The daily brief tells me exactly what to tackle first. Saves me 20 minutes every morning.',
    role: 'Software engineer',
  },
  {
    quote:
      'Voice control on my commute means tasks are ready before I sit down at my desk.',
    role: 'Operations lead',
  },
];

export default function LandingPage() {
  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--border-default) / 0.35) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border-default) / 0.35) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 70% 55% at 50% 0%, black 10%, transparent 70%)',
        }}
      />
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/8 blur-[100px] -z-10" />

      {/* Hero */}
      <section className="pt-8 pb-10 md:pt-14 md:pb-14 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/20 bg-accent/10 text-xs font-medium text-accent mb-5">
                <Sparkles className="w-3.5 h-3.5" />
                AI task organizer
              </div>

              <h1 className="text-[2.25rem] sm:text-5xl font-semibold tracking-tight text-text-primary leading-[1.1]">
                Dump your thoughts.
                <br />
                <span className="text-accent">Get a clear plan.</span>
              </h1>

              <p className="mt-5 text-base sm:text-lg text-text-secondary leading-relaxed max-w-lg">
                Brain-Dump turns messy notes, meetings, and ideas into prioritized tasks on a
                Kanban board — in seconds. No manual sorting required.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-colors shadow-[0_0_20px_var(--accent-glow)]"
                >
                  Start free — no card needed
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border-default bg-bg-card/40 hover:bg-bg-card text-text-primary text-sm font-semibold rounded-lg transition-colors"
                >
                  See how it works
                </a>
              </div>

              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-tertiary">
                {['3 free AI dumps/mo', 'Kanban board on Plus', '7-day Pro trial'].map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-priority-low" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
            >
              <ProductPreview />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Quick value props */}
      <section className="border-y border-border-default/50 bg-bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { label: 'Input', value: 'Text or voice' },
            { label: 'Output', value: 'Prioritized tasks' },
            { label: 'Board', value: 'Today · Week · Backlog' },
            { label: 'Plans', value: 'Free · $6 · $8' },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                {item.label}
              </p>
              <p className="text-sm font-semibold text-text-primary mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <div id="how-it-works">
        <HowItWorksSection />
      </div>

      <WhatYouGetSection />
      <PlanComparisonSection />
      <PricingSection />

      {/* Testimonials */}
      <section className="pt-10 pb-8 md:pt-12 md:pb-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary mb-2">
              Testimonials
            </p>
            <h2 className="text-xl sm:text-2xl font-semibold text-text-primary">
              Built for people who think in bursts
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <motion.blockquote
                key={t.role}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.05 }}
                className="relative p-5 rounded-xl border border-border-default bg-bg-card/30"
              >
                <Quote className="w-5 h-5 text-accent/40 mb-3" />
                <p className="text-sm text-text-secondary leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-4 text-xs font-medium text-text-tertiary">{t.role}</footer>
              </motion.blockquote>
            ))}
          </div>
        </div>
      </section>

      <FaqCtaSection />

      <footer className="border-t border-border-default/60 py-6 px-4 sm:px-6 bg-bg-primary">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Brain className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Brain-Dump</p>
              <p className="text-xs text-text-tertiary">Messy thoughts → clear action</p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-6 text-xs text-text-tertiary">
            <a href="#how-it-works" className="hover:text-text-secondary transition-colors">
              How it works
            </a>
            <Link href="/pricing" className="hover:text-text-secondary transition-colors">
              Pricing
            </Link>
            <Link href="/register" className="hover:text-text-secondary transition-colors">
              Register
            </Link>
            <Link href="/login" className="hover:text-text-secondary transition-colors">
              Login
            </Link>
          </nav>
          <p className="text-xs text-text-tertiary">© {new Date().getFullYear()} Brain-Dump</p>
        </div>
      </footer>
    </div>
  );
}
