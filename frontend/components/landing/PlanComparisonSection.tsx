'use client';

import { Check, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { PLAN_COMPARISON } from './planData';
import { cn } from '@/lib/utils';

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return <Check className="w-4 h-4 text-priority-low mx-auto" />;
  }
  if (value === false) {
    return <Minus className="w-4 h-4 text-text-tertiary/50 mx-auto" />;
  }
  return <span className="text-xs font-medium text-text-secondary">{value}</span>;
}

export function PlanComparisonSection() {
  return (
    <section id="compare-plans" className="pt-10 pb-10 md:pt-12 md:pb-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-8"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent mb-2">
            Compare plans
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight">
            Know exactly what you are buying
          </h2>
          <p className="mt-3 text-sm text-text-secondary">
            Every feature listed below. No hidden limits.
          </p>
        </motion.div>

        <div className="rounded-2xl border border-border-default bg-bg-card/40 overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-border-default bg-bg-secondary/40">
                <th className="px-5 py-4 text-xs font-semibold text-text-tertiary w-[40%]">Feature</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-text-primary">Free</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-text-primary">Plus</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-accent">Pro</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_COMPARISON.map((row, i) => (
                <tr
                  key={row.feature}
                  className={cn(
                    'border-b border-border-default/50 last:border-b-0',
                    i % 2 === 0 && 'bg-bg-primary/20'
                  )}
                >
                  <td className="px-5 py-3.5 text-sm text-text-primary">{row.feature}</td>
                  <td className="px-4 py-3.5 text-center">
                    <CellValue value={row.free} />
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <CellValue value={row.plus} />
                  </td>
                  <td className="px-4 py-3.5 text-center bg-accent/5">
                    <CellValue value={row.pro} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
