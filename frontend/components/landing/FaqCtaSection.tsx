'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, ChevronRight, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const FAQ_ITEMS = [
  {
    q: 'How does Brain-Dump work?',
    a: 'Paste or speak unstructured notes. AI extracts tasks, assigns priority and time estimates, then places them on a Today / This Week / Backlog Kanban board.',
  },
  {
    q: 'What is the difference between Plus and Pro?',
    a: 'Plus ($6/mo) unlocks full AI organization and Kanban. Pro ($8/mo) adds Voice Assistant, Google Calendar sync, meeting reminders, and analytics — with a 7-day free trial.',
  },
  {
    q: 'Do I need a credit card to start?',
    a: 'No. Create a free account with manual tasks and three AI brain dumps per month. Upgrade only when you need more.',
  },
  {
    q: 'How does billing work internationally?',
    a: 'Paid plans are billed in USD through Lemon Squeezy. Checkout works globally and you can cancel anytime from your account.',
  },
];

function FaqItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border transition-colors',
        isOpen
          ? 'border-accent/30 bg-bg-card shadow-sm'
          : 'border-border-default bg-bg-card/40 hover:border-border-active/50'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-medium text-text-primary leading-snug pr-2">{question}</span>
        <span
          className={cn(
            'flex-shrink-0 w-6 h-6 rounded-md border flex items-center justify-center transition-colors',
            isOpen
              ? 'border-accent/40 bg-accent/15 text-accent'
              : 'border-border-default bg-bg-primary text-text-tertiary'
          )}
        >
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', isOpen && 'rotate-180')} />
        </span>
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-4 text-sm text-text-secondary leading-relaxed border-t border-border-default/40 pt-3 mx-5">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FaqCtaSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="pt-10 pb-10 md:pt-12 md:pb-12 px-4 sm:px-6 border-t border-border-default/50 bg-bg-secondary/25">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-[1fr_340px] gap-8 lg:gap-10 items-start">
          {/* FAQ column */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-4 h-4 text-accent" />
              <p className="text-xs font-semibold uppercase tracking-widest text-accent">FAQ</p>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight">
              Questions before you start?
            </h2>
            <p className="mt-2 text-sm text-text-secondary max-w-lg">
              Everything you need to know about how Brain-Dump works and what each plan includes.
            </p>

            <div className="mt-6 space-y-2.5">
              {FAQ_ITEMS.map((item, i) => (
                <FaqItem
                  key={item.q}
                  question={item.q}
                  answer={item.a}
                  isOpen={openIndex === i}
                  onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
                />
              ))}
            </div>
          </div>

          {/* CTA column */}
          <div className="lg:sticky lg:top-20">
            <div className="rounded-2xl border border-accent/25 bg-gradient-to-b from-accent/10 via-bg-card to-bg-card p-6 shadow-[0_16px_48px_rgba(0,0,0,0.35)]">
              <p className="text-xs font-semibold uppercase tracking-widest text-accent">Get started</p>
              <h3 className="mt-2 text-xl font-semibold text-text-primary leading-snug">
                Turn scattered thoughts into a plan you can follow
              </h3>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                Join free today. Upgrade to Plus or Pro when you are ready for more.
              </p>

              <ul className="mt-5 space-y-2.5">
                {['No credit card required', '3 AI dumps on Free', '7-day Pro trial'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-text-secondary">
                    <Check className="w-4 h-4 text-priority-low flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-col gap-2.5">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Create free account
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center w-full py-3 border border-border-default bg-bg-primary/60 hover:bg-bg-primary text-text-primary text-sm font-semibold rounded-lg transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/pricing"
                  className="text-center text-xs text-text-tertiary hover:text-accent transition-colors pt-1"
                >
                  Compare plans →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
