'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { buildTranscript, getSpeechRecognition, isSpeechSupported } from '@/lib/voice/recognition';
import { isCommandLike } from '@/lib/voice/wakeWord';
import { detectWakeWord } from '@/lib/voice/wakeWordDetect';
import {
  getSpeechLangPreference,
  getSpeechLangLabel,
  resolveRecognitionLang,
  setSpeechLangPreference,
  SPEECH_LANGUAGES,
} from '@/lib/voice/speechLang';
import { speakText, stopSpeaking } from '@/lib/voice/speak';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { useTasks } from '@/context/TaskContext';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import type {
  VoiceActivationMode,
  VoiceClarificationOption,
  VoiceReplyLanguage,
  VoiceSttStrategy,
} from '@/lib/types';

const STORAGE_KEY = 'dumpVoiceActive';
const PROCESS_DEBOUNCE_MS = 900;

export type VoicePhase =
  | 'idle'
  | 'unsupported'
  | 'inactive'
  | 'listening'
  | 'capturing'
  | 'processing'
  | 'speaking'
  | 'clarify'
  | 'confirm';

export interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

function pushMessage(prev: VoiceMessage[], role: VoiceMessage['role'], text: string) {
  return [...prev, { id: `${Date.now()}-${role}`, role, text }].slice(-5);
}

async function unlockMicrophone(): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia) return true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

const AFFIRMATIVE =
  /^(confirm|yes|yeah|yep|ok|okay|haan|ha|ji|theek|হ্যাঁ|ঠিক|نعم|oui|sí|si|ja|da|delete it|do it)$/i;

export function useVoiceAssistant() {
  const [phase, setPhase] = useState<VoicePhase>('inactive');
  const [liveText, setLiveText] = useState('');
  const [statusLine, setStatusLine] = useState('Voice assistant');
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);
  const [clarificationOptions, setClarificationOptions] = useState<VoiceClarificationOption[]>([]);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [speechLang, setSpeechLangState] = useState('auto');
  const [activationMode, setActivationMode] = useState<VoiceActivationMode>('always');
  const [sttStrategy, setSttStrategy] = useState<VoiceSttStrategy>('auto');
  const [replyLanguage, setReplyLanguage] = useState<VoiceReplyLanguage>('en');
  const [lastDetectedLang, setLastDetectedLang] = useState<string | undefined>();

  const pendingConfirmRef = useRef<string | null>(null);
  const phaseRef = useRef<VoicePhase>('inactive');
  const recRef = useRef<SpeechRecognition | null>(null);
  const pausedRef = useRef(false);
  const busyRef = useRef(false);
  const lastSentRef = useRef('');
  const processTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const whisperLoopRef = useRef(false);
  const settingsRef = useRef({ activationMode, sttStrategy, replyLanguage, speechLang });

  pendingConfirmRef.current = pendingConfirm;
  settingsRef.current = { activationMode, sttStrategy, replyLanguage, speechLang };

  const { fetchTasks, syncTasksFromVoice } = useTasks();
  const { refreshUsage } = useAuth();
  const { captureFinal, stop: stopCapture, resolveStrategy } = useVoiceCapture();

  useEffect(() => {
    setSpeechLangState(getSpeechLangPreference());
    api
      .getVoiceSettings()
      .then((res) => {
        setActivationMode(res.settings.activationMode);
        setSttStrategy(res.settings.sttStrategy);
        setReplyLanguage(res.settings.replyLanguage);
      })
      .catch(() => {
        /* use defaults */
      });
  }, []);

  const setPhaseSafe = useCallback((p: VoicePhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const clearTimers = useCallback(() => {
    if (processTimerRef.current) clearTimeout(processTimerRef.current);
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    processTimerRef.current = null;
    restartTimerRef.current = null;
  }, []);

  const stopRecognition = useCallback(() => {
    whisperLoopRef.current = false;
    stopCapture();
    const rec = recRef.current;
    recRef.current = null;
    if (!rec) return;
    try {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      rec.onstart = null;
      rec.onspeechstart = null;
      rec.abort();
    } catch {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
  }, [stopCapture]);

  const scheduleRestart = useCallback(
    (delay = 400) => {
      if (pausedRef.current || busyRef.current) return;
      if (settingsRef.current.activationMode === 'manual' && phaseRef.current === 'inactive') return;
      clearTimers();
      restartTimerRef.current = setTimeout(() => {
        if (!pausedRef.current && !busyRef.current) startListeningRef.current();
      }, delay);
    },
    [clearTimers]
  );

  const runCommand = useCallback(
    async (rawText: string, confirmDelete = false) => {
      const trimmed = rawText.trim();
      const isAffirm = AFFIRMATIVE.test(trimmed);

      if (pendingConfirmRef.current && !confirmDelete && isAffirm) {
        const pending = pendingConfirmRef.current;
        setPendingConfirm(null);
        busyRef.current = true;
        stopRecognition();
        setPhaseSafe('processing');
        void runCommandRef.current(pending, true);
        return;
      }

      if (!isCommandLike(rawText)) {
        setStatusLine('Say a command — e.g. "add buy milk" or "done"');
        busyRef.current = false;
        scheduleRestart(300);
        return;
      }

      if (trimmed === lastSentRef.current && !confirmDelete) {
        busyRef.current = false;
        scheduleRestart(300);
        return;
      }

      lastSentRef.current = trimmed;
      stopRecognition();
      busyRef.current = true;
      setPhaseSafe('processing');
      setStatusLine('Working on it…');
      setMessages((m) => pushMessage(m, 'user', trimmed));

      try {
        const res = await api.voiceCommand(rawText, confirmDelete);
        const assistantReply = res.spokenReply || 'Done.';
        if (res.detectedLanguage) setLastDetectedLang(res.detectedLanguage);

        if (res.translatedCommand && res.originalTranscript && res.translatedCommand !== res.originalTranscript) {
          setMessages((m) => {
            const next = [...m];
            const lastUser = [...next].reverse().find((msg) => msg.role === 'user');
            if (lastUser) {
              lastUser.text = `${res.originalTranscript} → ${res.translatedCommand}`;
            }
            return next;
          });
        }

        setMessages((m) => pushMessage(m, 'assistant', assistantReply));

        if (res.needsClarification && res.clarificationOptions?.length) {
          setClarificationOptions(res.clarificationOptions);
          setPhaseSafe('clarify');
          setStatusLine('Say the number or task name');
          await speakText(res.spokenReply, settingsRef.current.replyLanguage, res.detectedLanguage);
          busyRef.current = false;
          scheduleRestart(400);
          return;
        }

        setClarificationOptions([]);

        if (res.needsConfirmation) {
          setPendingConfirm(res.pendingTranscript || trimmed);
          setPhaseSafe('confirm');
          setStatusLine('Say "confirm" or tap Confirm');
          await speakText(res.spokenReply, settingsRef.current.replyLanguage, res.detectedLanguage);
          busyRef.current = false;
          scheduleRestart(400);
          return;
        }

        if (res.tasks?.length) syncTasksFromVoice(res.tasks);
        else await fetchTasks();
        await refreshUsage();
        toast.success(res.spokenReply || 'Done');

        setPhaseSafe('speaking');
        setStatusLine('Speaking…');
        await speakText(res.spokenReply, settingsRef.current.replyLanguage, res.detectedLanguage);

        setLiveText('');
        busyRef.current = false;
        lastSentRef.current = '';
        setPhaseSafe('listening');
        setStatusLine('Listening — speak your command');
        scheduleRestart(200);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Voice command failed';
        toast.error(msg);
        setStatusLine(msg);
        await speakText(msg.slice(0, 80), settingsRef.current.replyLanguage);
        busyRef.current = false;
        lastSentRef.current = '';
        scheduleRestart(600);
      }
    },
    [fetchTasks, refreshUsage, scheduleRestart, setPhaseSafe, stopRecognition, syncTasksFromVoice]
  );

  const runCommandRef = useRef(runCommand);
  runCommandRef.current = runCommand;

  const handleFinalTranscript = useCallback(
    (text: string) => {
      const { activationMode: mode } = settingsRef.current;
      const wake = detectWakeWord(text, mode);
      if (!wake.activated) {
        if (mode === 'hey_dump') {
          setStatusLine('Say "Hey Dump" then your command');
        }
        return;
      }
      const cmd = wake.command;
      if (phaseRef.current === 'clarify' || phaseRef.current === 'confirm') {
        void runCommandRef.current(cmd);
        return;
      }
      if (!busyRef.current) queueProcessRef.current(cmd);
    },
    []
  );

  const queueProcess = useCallback(
    (text: string) => {
      if (!text || busyRef.current || pausedRef.current) return;
      clearTimers();
      processTimerRef.current = setTimeout(() => {
        busyRef.current = true;
        stopRecognition();
        void runCommandRef.current(text);
      }, PROCESS_DEBOUNCE_MS);
    },
    [clearTimers, stopRecognition]
  );

  const queueProcessRef = useRef(queueProcess);
  queueProcessRef.current = queueProcess;

  const startWhisperLoop = useCallback(async () => {
    if (pausedRef.current || busyRef.current || !whisperLoopRef.current) return;
    setPhaseSafe('capturing');
    setStatusLine('Listening (Whisper)… speak now');

    try {
      const engine = await captureFinal(
        settingsRef.current.sttStrategy,
        {
          onInterim: (t) => setLiveText(t),
          onCapturing: () => setPhaseSafe('capturing'),
          onFinal: (t) => {
            setLiveText(t);
            handleFinalTranscript(t);
          },
          onError: (msg) => {
            if (!pausedRef.current) setStatusLine(msg);
          },
        },
        settingsRef.current.speechLang
      );

      if (!pausedRef.current && !busyRef.current && whisperLoopRef.current) {
        setPhaseSafe('listening');
        scheduleRestart(engine === 'whisper' ? 300 : 200);
      }
    } catch {
      scheduleRestart(800);
    }
  }, [captureFinal, handleFinalTranscript, scheduleRestart, setPhaseSafe]);

  const startBrowserListening = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR || pausedRef.current || busyRef.current) return false;

    stopRecognition();
    setLiveText('');
    whisperLoopRef.current = false;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = resolveRecognitionLang(settingsRef.current.speechLang);

    rec.onstart = () => {
      setPhaseSafe('listening');
      const langLabel = getSpeechLangLabel(
        settingsRef.current.speechLang === 'auto' ? 'auto' : settingsRef.current.speechLang
      );
      setStatusLine(
        settingsRef.current.activationMode === 'hey_dump'
          ? 'Hey Dump mode — say "Hey Dump" + command'
          : settingsRef.current.speechLang === 'auto'
            ? 'Listening — speak in any language'
            : `Listening — ${langLabel}`
      );
      setNeedsPermission(false);
    };

    rec.onspeechstart = () => {
      if (!busyRef.current) setStatusLine('Hearing you…');
    };

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const { display, lastIsFinal } = buildTranscript(e);
      setLiveText(display);
      if (lastIsFinal && display.length >= 2 && !busyRef.current) {
        handleFinalTranscript(display);
      }
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === 'aborted') return;
      recRef.current = null;

      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        pausedRef.current = true;
        localStorage.removeItem(STORAGE_KEY);
        setNeedsPermission(true);
        setPhaseSafe('inactive');
        setStatusLine('Click "Enable voice" to allow microphone');
        return;
      }

      if (e.error === 'no-speech') {
        setStatusLine('Listening — speak your command');
      }
    };

    rec.onend = () => {
      recRef.current = null;
      if (pausedRef.current || busyRef.current) return;
      scheduleRestart(350);
    };

    recRef.current = rec;
    try {
      rec.start();
      return true;
    } catch {
      return false;
    }
  }, [handleFinalTranscript, scheduleRestart, setPhaseSafe, stopRecognition]);

  const startListening = useCallback(() => {
    if (pausedRef.current || busyRef.current) return;

    const engine = resolveStrategy(settingsRef.current.sttStrategy);
    if (engine === 'browser' && startBrowserListening()) return;

    whisperLoopRef.current = true;
    void startWhisperLoop();
  }, [resolveStrategy, startBrowserListening, startWhisperLoop]);

  const startListeningRef = useRef(startListening);
  startListeningRef.current = startListening;

  const setSpeechLang = useCallback(
    (code: string) => {
      setSpeechLangPreference(code);
      setSpeechLangState(code);
      settingsRef.current.speechLang = code;
      if (!pausedRef.current && phaseRef.current === 'listening') {
        scheduleRestart(200);
      }
    },
    [scheduleRestart]
  );

  const updateVoiceSettings = useCallback(
    async (patch: Partial<{ activationMode: VoiceActivationMode; sttStrategy: VoiceSttStrategy; replyLanguage: VoiceReplyLanguage }>) => {
      if (patch.activationMode !== undefined) setActivationMode(patch.activationMode);
      if (patch.sttStrategy !== undefined) setSttStrategy(patch.sttStrategy);
      if (patch.replyLanguage !== undefined) setReplyLanguage(patch.replyLanguage);
      try {
        const res = await api.patchVoiceSettings(patch);
        setActivationMode(res.settings.activationMode);
        setSttStrategy(res.settings.sttStrategy);
        setReplyLanguage(res.settings.replyLanguage);
      } catch {
        toast.error('Could not save voice settings');
      }
    },
    []
  );

  const activate = useCallback(async () => {
    const browserOk = isSpeechSupported();
    const whisperOk = !!navigator.mediaDevices?.getUserMedia;
    if (!browserOk && resolveStrategy(settingsRef.current.sttStrategy) === 'browser' && !whisperOk) {
      setPhaseSafe('unsupported');
      setStatusLine('Voice needs Chrome/Edge or microphone access');
      return;
    }

    pausedRef.current = false;
    busyRef.current = false;
    localStorage.setItem(STORAGE_KEY, '1');
    setStatusLine('Enabling microphone…');

    const ok = await unlockMicrophone();
    if (!ok) {
      setNeedsPermission(true);
      setPhaseSafe('inactive');
      setStatusLine('Allow microphone in browser settings');
      return;
    }

    startListening();
  }, [resolveStrategy, setPhaseSafe, startListening]);

  const deactivate = useCallback(() => {
    pausedRef.current = true;
    busyRef.current = false;
    localStorage.removeItem(STORAGE_KEY);
    clearTimers();
    stopRecognition();
    stopSpeaking();
    setLiveText('');
    setClarificationOptions([]);
    setPhaseSafe('inactive');
    setStatusLine('Voice paused');
  }, [clearTimers, setPhaseSafe, stopRecognition]);

  const confirmPending = useCallback(() => {
    if (!pendingConfirm) return;
    const cmd = pendingConfirm;
    setPendingConfirm(null);
    busyRef.current = true;
    void runCommand(cmd, true);
  }, [pendingConfirm, runCommand]);

  const cancelConfirm = useCallback(() => {
    setPendingConfirm(null);
    setClarificationOptions([]);
    busyRef.current = false;
    setPhaseSafe('listening');
    setStatusLine('Cancelled — listening again');
    scheduleRestart(300);
  }, [scheduleRestart, setPhaseSafe]);

  const pushToTalk = useCallback(() => {
    void activate();
  }, [activate]);

  useEffect(() => {
    if (settingsRef.current.activationMode === 'manual') return;
    if (!isSpeechSupported() && resolveStrategy('auto') === 'browser') {
      setPhaseSafe('unsupported');
      return;
    }

    let cancelled = false;
    pausedRef.current = false;

    const boot = async () => {
      if (cancelled || settingsRef.current.activationMode === 'manual') return;
      if (localStorage.getItem(STORAGE_KEY) !== '1') {
        setNeedsPermission(true);
        setStatusLine('Tap Activate voice to start');
        return;
      }
      const ok = await unlockMicrophone();
      if (!ok) {
        setNeedsPermission(true);
        setStatusLine('Tap Activate voice to allow microphone');
        return;
      }
      if (!cancelled) startListeningRef.current();
    };

    const t = setTimeout(() => void boot(), 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [resolveStrategy, setPhaseSafe]);

  useEffect(() => {
    return () => {
      pausedRef.current = true;
      clearTimers();
      stopRecognition();
      stopSpeaking();
    };
  }, [clearTimers, stopRecognition]);

  const isActive = phase === 'listening' || phase === 'capturing';
  const isBusy =
    phase === 'processing' || phase === 'speaking' || phase === 'confirm' || phase === 'clarify';

  return {
    phase,
    isActive,
    isBusy,
    isSupported: phase !== 'unsupported',
    liveText,
    statusLine,
    messages,
    needsPermission,
    pendingConfirm,
    clarificationOptions,
    speechLang,
    speechLanguages: SPEECH_LANGUAGES,
    activationMode,
    sttStrategy,
    replyLanguage,
    activate,
    deactivate,
    pushToTalk,
    confirmPending,
    cancelConfirm,
    setSpeechLang,
    updateVoiceSettings,
  };
}
