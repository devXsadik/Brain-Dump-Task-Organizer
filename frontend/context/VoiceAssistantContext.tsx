'use client';

import { createContext, useContext } from 'react';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';

type VoiceAssistantContextValue = ReturnType<typeof useVoiceAssistant>;

const VoiceAssistantContext = createContext<VoiceAssistantContextValue | null>(null);

export function VoiceAssistantProvider({ children }: { children: React.ReactNode }) {
  const value = useVoiceAssistant();
  return (
    <VoiceAssistantContext.Provider value={value}>{children}</VoiceAssistantContext.Provider>
  );
}

export function useVoiceAssistantContext() {
  const ctx = useContext(VoiceAssistantContext);
  if (!ctx) throw new Error('useVoiceAssistantContext requires VoiceAssistantProvider');
  return ctx;
}

export function useOptionalVoiceAssistant() {
  return useContext(VoiceAssistantContext);
}
