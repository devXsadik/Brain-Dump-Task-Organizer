'use client';

import { ArrowRight, Brain } from 'lucide-react';
import { motion } from 'framer-motion';
import { WORKFLOW_STEPS } from './planData';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.4 },
};

export function HowItWorksSection() {
  return (
    <section className="pt-10 pb-12 md:pt-12 md:pb-14 px-4 sm:px-6 bg-bg-secondary/20 border-y border-border-default/40">
      <div className="max-w-6xl mx-auto">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent mb-2">
            How it works
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight">
            Messy thoughts in. Organized plan out.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-text-secondary leading-relaxed">
            Brain-Dump is not another to-do app. It turns unstructured input into actionable tasks
            automatically.
          </p>
        </motion.div>

        {/* Visual flow */}
        <motion.div
          {...fadeUp}
          className="mb-10 rounded-2xl border border-border-default bg-bg-card/50 overflow-hidden"
        >
          <div className="grid md:grid-cols-[1fr_auto_1fr] items-stretch">
            {/* Input */}
            <div className="p-5 md:p-6 border-b md:border-b-0 md:border-r border-border-default/60">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-3">
                You dump
              </p>
              <div className="rounded-lg bg-bg-primary border border-border-default p-4 font-mono text-xs sm:text-sm text-text-secondary leading-relaxed">
                Call Sarah about Q2 budget tomorrow.
                <br />
                Fix the production login bug — urgent!
                <br />
                Team standup Monday 9am.
                <br />
                Look into analytics tools when I have time.
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex flex-col items-center justify-center px-4 py-6 bg-accent/5">
              <div className="w-10 h-10 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center">
                <Brain className="w-5 h-5 text-accent" />
              </div>
              <ArrowRight className="w-5 h-5 text-accent mt-2" />
              <p className="text-[10px] font-semibold text-accent mt-1">AI</p>
            </div>
            <div className="flex md:hidden items-center justify-center py-3 bg-accent/5 border-y border-border-default/60">
              <Brain className="w-4 h-4 text-accent mr-2" />
              <span className="text-xs font-semibold text-accent">AI organizes →</span>
            </div>

            {/* Output */}
            <div className="p-5 md:p-6">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-3">
                You get
              </p>
              <div className="space-y-2">
                {[
                  { col: 'Today', task: 'Fix production login bug', tag: 'urgent', color: 'text-category-today' },
                  { col: 'Today', task: 'Team standup prep', tag: '9 AM', color: 'text-category-today' },
                  { col: 'This Week', task: 'Call Sarah about Q2 budget', tag: 'high', color: 'text-category-week' },
                  { col: 'Backlog', task: 'Research analytics tools', tag: 'low', color: 'text-category-backlog' },
                ].map((item) => (
                  <div
                    key={item.task}
                    className="flex items-center gap-2 rounded-lg bg-bg-primary border border-border-default px-3 py-2"
                  >
                    <span className={`text-[9px] font-bold uppercase w-14 flex-shrink-0 ${item.color}`}>
                      {item.col}
                    </span>
                    <span className="text-xs text-text-primary flex-1 truncate">{item.task}</span>
                    <span className="text-[9px] text-text-tertiary uppercase">{item.tag}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-4">
          {WORKFLOW_STEPS.map((item, i) => (
            <motion.div
              key={item.step}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.06 }}
              className="rounded-xl border border-border-default bg-bg-card/40 p-5"
            >
              <span className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-accent/15 text-accent text-xs font-bold">
                {item.step}
              </span>
              <h3 className="mt-3 text-base font-semibold text-text-primary">{item.title}</h3>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">{item.desc}</p>
              <p className="mt-3 text-xs text-text-tertiary italic border-t border-border-default/50 pt-3">
                {item.example}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
