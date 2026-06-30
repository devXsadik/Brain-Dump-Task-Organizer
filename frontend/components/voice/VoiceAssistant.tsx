'use client';

import { useMemo, useState } from 'react';
import { Brain, ChevronDown, ChevronUp, Loader2, Mic, MicOff, Volume2 } from 'lucide-react';
import { useOptionalVoiceAssistant } from '@/context/VoiceAssistantContext';
import { VoiceWaveform } from './VoiceWaveform';
import { VoiceCommandsHelpButton } from './VoiceCommandsHelp';
import { cn } from '@/lib/utils';

export function VoiceAssistantPanel() {
  const voice = useOptionalVoiceAssistant();
  const [expanded, setExpanded] = useState(false);
  if (!voice) return null;

  const {
    phase,
    isActive,
    isBusy,
    isSupported,
    liveText,
    statusLine,
    messages,
    needsPermission,
    pendingConfirm,
    clarificationOptions,
    activate,
    deactivate,
    pushToTalk,
    confirmPending,
    cancelConfirm,
    speechLang,
    speechLanguages,
    setSpeechLang,
    activationMode,
    sttStrategy,
    replyLanguage,
    updateVoiceSettings,
  } = voice;

  if (!isSupported) {
    return (
      <div className="fixed bottom-5 right-5 z-50 w-[280px] rounded-2xl border border-border-default bg-bg-card/95 px-4 py-3 shadow-xl backdrop-blur-xl">
        <p className="text-xs text-text-secondary">
          Voice assistant requires microphone access. Whisper fallback works in Safari/Firefox.
        </p>
      </div>
    );
  }

  const statusTone =
    phase === 'listening' || phase === 'capturing'
      ? 'text-accent'
      : phase === 'processing'
        ? 'text-category-week'
        : phase === 'confirm' || phase === 'clarify'
          ? 'text-priority-urgent'
          : 'text-text-tertiary';

  const latestAssistant = useMemo(
    () => [...messages].reverse().find((msg) => msg.role === 'assistant')?.text,
    [messages]
  );
  const latestUser = useMemo(
    () => [...messages].reverse().find((msg) => msg.role === 'user')?.text,
    [messages]
  );

  const showDetails = expanded || !!pendingConfirm || !!liveText || isBusy || clarificationOptions.length > 0;

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[300px] pointer-events-none">
      <div className="pointer-events-auto overflow-hidden rounded-2xl border border-border-default bg-bg-card/95 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3 px-3.5 py-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl border',
              isActive
                ? 'border-accent/30 bg-accent/12 text-accent'
                : 'border-border-default bg-bg-primary text-text-tertiary'
            )}
          >
            <Brain className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-text-primary">Dump Assistant</p>
              {isActive && <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />}
            </div>
            <p className={cn('truncate text-[11px]', statusTone)}>{statusLine}</p>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-default bg-bg-primary text-text-tertiary transition-colors hover:text-text-primary"
            title={expanded ? 'Collapse voice assistant' : 'Expand voice assistant'}
          >
            {showDetails ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>

        <div className="border-t border-border-default/70 px-3.5 py-3">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 rounded-xl border border-border-default bg-bg-primary/70 px-3 py-2.5">
              {showDetails ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-tertiary">
                      {phase === 'speaking'
                        ? 'Assistant speaking'
                        : phase === 'clarify'
                          ? 'Pick a task'
                          : isActive
                            ? 'Ready for command'
                            : 'Voice controls'}
                    </span>
                    <VoiceWaveform active={isActive || phase === 'speaking'} className="h-5" />
                  </div>

                  {liveText && (
                    <p className="line-clamp-2 text-[11px] leading-relaxed text-accent">
                      &ldquo;{liveText}&rdquo;
                    </p>
                  )}

                  {phase === 'clarify' && clarificationOptions.length > 0 && (
                    <ul className="space-y-0.5 text-[10px] text-text-secondary">
                      {clarificationOptions.map((o) => (
                        <li key={o.id}>
                          {o.index ?? 0}. {o.title}
                        </li>
                      ))}
                    </ul>
                  )}

                  {!liveText && latestAssistant && (
                    <p className="line-clamp-2 text-[11px] leading-relaxed text-text-secondary">
                      {latestAssistant}
                    </p>
                  )}

                  {!liveText && !latestAssistant && latestUser && (
                    <p className="line-clamp-2 text-[11px] leading-relaxed text-text-secondary">
                      Last: {latestUser}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-text-primary">
                      {isActive ? 'Voice is ready' : 'Compact voice control'}
                    </p>
                    <p className="truncate text-[11px] text-text-tertiary">
                      {isActive ? 'Speak naturally to update tasks' : 'Activate when you need hands-free edits'}
                    </p>
                  </div>
                  <VoiceWaveform active={isActive || phase === 'speaking'} className="h-5 shrink-0" />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={isActive ? deactivate : pushToTalk}
              disabled={isBusy}
              title={isActive ? 'Pause voice assistant' : 'Start voice assistant'}
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors',
                isActive
                  ? 'border-accent/40 bg-accent text-white'
                  : 'border-border-default bg-bg-primary text-accent hover:bg-accent/10',
                isBusy && 'opacity-60'
              )}
            >
              {phase === 'processing' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : phase === 'speaking' ? (
                <Volume2 className="h-5 w-5 animate-pulse" />
              ) : isActive ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>
          </div>

          {showDetails && (
            <div className="mt-3 space-y-3">
              {phase === 'confirm' && pendingConfirm && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={confirmPending}
                    className="flex-1 rounded-lg bg-priority-urgent py-2 text-xs font-semibold text-white"
                  >
                    Confirm delete
                  </button>
                  <button
                    type="button"
                    onClick={cancelConfirm}
                    className="flex-1 rounded-lg border border-border-default py-2 text-xs text-text-secondary"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {!isActive && !isBusy && (
                <button
                  type="button"
                  onClick={activate}
                  className={cn(
                    'w-full rounded-xl py-2.5 text-xs font-semibold text-white transition-colors',
                    needsPermission
                      ? 'bg-priority-urgent hover:bg-priority-urgent/90'
                      : 'bg-accent hover:bg-accent-hover'
                  )}
                >
                  {needsPermission ? 'Allow microphone' : 'Activate voice'}
                </button>
              )}

              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2">
                  <label htmlFor="voice-activation" className="shrink-0 text-[10px] text-text-tertiary w-14">
                    Mode
                  </label>
                  <select
                    id="voice-activation"
                    value={activationMode}
                    onChange={(e) =>
                      updateVoiceSettings({
                        activationMode: e.target.value as 'always' | 'hey_dump' | 'manual',
                      })
                    }
                    className="min-w-0 flex-1 rounded-lg border border-border-default bg-bg-primary px-2 py-1.5 text-[11px] text-text-primary outline-none focus:border-accent/40"
                  >
                    <option value="always">Always on</option>
                    <option value="hey_dump">Hey Dump</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="voice-engine" className="shrink-0 text-[10px] text-text-tertiary w-14">
                    Engine
                  </label>
                  <select
                    id="voice-engine"
                    value={sttStrategy}
                    onChange={(e) =>
                      updateVoiceSettings({
                        sttStrategy: e.target.value as 'auto' | 'browser' | 'whisper',
                      })
                    }
                    className="min-w-0 flex-1 rounded-lg border border-border-default bg-bg-primary px-2 py-1.5 text-[11px] text-text-primary outline-none focus:border-accent/40"
                  >
                    <option value="auto">Auto</option>
                    <option value="browser">Browser</option>
                    <option value="whisper">Whisper</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="voice-lang" className="shrink-0 text-[10px] text-text-tertiary w-14">
                    Speak in
                  </label>
                  <select
                    id="voice-lang"
                    value={speechLang}
                    onChange={(e) => setSpeechLang(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-border-default bg-bg-primary px-2 py-1.5 text-[11px] text-text-primary outline-none focus:border-accent/40"
                  >
                    {speechLanguages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="voice-reply" className="shrink-0 text-[10px] text-text-tertiary w-14">
                    Reply
                  </label>
                  <select
                    id="voice-reply"
                    value={replyLanguage}
                    onChange={(e) =>
                      updateVoiceSettings({ replyLanguage: e.target.value as 'en' | 'auto' })
                    }
                    className="min-w-0 flex-1 rounded-lg border border-border-default bg-bg-primary px-2 py-1.5 text-[11px] text-text-primary outline-none focus:border-accent/40"
                  >
                    <option value="en">English</option>
                    <option value="auto">Detected language</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 flex-1 text-[10px] leading-relaxed text-text-tertiary">
                  Any language → tasks saved in English
                </p>
                <VoiceCommandsHelpButton className="shrink-0" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use VoiceAssistantPanel inside VoiceAssistantProvider */
export const VoiceAssistant = VoiceAssistantPanel;
