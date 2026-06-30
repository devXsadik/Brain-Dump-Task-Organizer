'use client';

import { useState, useEffect } from 'react';
import { useTasks } from '@/context/TaskContext';
import { useAuth } from '@/context/AuthContext';
import { VoiceInputButton } from '@/components/voice/VoiceInputButton';
import { Brain, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function BrainDumpInput() {
  const [text, setText] = useState('');
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const { processDump, processing } = useTasks();
  const { isPro } = useAuth();
  const maxLength = 5000;

  const loadingTexts = [
    'Analyzing your thoughts…',
    'Extracting action items…',
    'Estimating time requirements…',
    'Assigning priorities…',
    'Organizing your board…',
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (processing) {
      setLoadingTextIndex(0);
      interval = setInterval(() => {
        setLoadingTextIndex((prev) => (prev + 1) % loadingTexts.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [processing, loadingTexts.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || processing) return;
    processDump(text);
    setText('');
  };

  const getCharColor = () => {
    const ratio = text.length / maxLength;
    if (ratio > 0.9) return 'text-priority-urgent';
    if (ratio > 0.75) return 'text-priority-high';
    return 'text-text-tertiary';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <form onSubmit={handleSubmit}>
        <div className="rounded-2xl border border-border-default bg-bg-card/60 overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border-default/60 bg-bg-secondary/30">
            <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Brain className="w-4 h-4 text-accent" />
            </div>
            <div>
              <label htmlFor="braindump" className="block text-sm font-semibold text-text-primary">
                Brain dump
              </label>
              <p className="text-xs text-text-tertiary mt-0.5">
                Paste meetings, todos, ideas — AI will organize them
              </p>
            </div>
          </div>

          <div className="p-5">
            <textarea
              id="braindump"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={processing}
              placeholder="Just dump everything — meetings, todos, ideas, errands, shower thoughts…"
              className="w-full h-56 sm:h-64 bg-bg-primary/60 text-text-primary placeholder:text-text-tertiary border border-border-default rounded-xl p-4 focus:ring-2 focus:ring-accent/30 focus:border-accent/50 outline-none resize-none transition-all disabled:opacity-50 text-sm leading-relaxed"
              maxLength={maxLength}
            />

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={cn('text-xs font-medium tabular-nums', getCharColor())}>
                  {text.length.toLocaleString()} / {maxLength.toLocaleString()}
                </span>
                {isPro && (
                  <VoiceInputButton
                    onTranscript={(t) =>
                      setText((prev) => (prev.trim() ? `${prev.trim()} ${t}` : t))
                    }
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={processing || !text.trim()}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent-hover disabled:bg-bg-secondary disabled:text-text-tertiary text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Organizing…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Organize with AI
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      <AnimatePresence>
        {processing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <div className="rounded-xl border border-border-default bg-bg-card/80 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <motion.span
                  key={loadingTextIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-medium text-accent flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {loadingTexts[loadingTextIndex]}
                </motion.span>
                <span className="text-xs text-text-tertiary">Processing</span>
              </div>
              <div className="h-1 bg-bg-primary rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-accent rounded-full animate-pulse" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
