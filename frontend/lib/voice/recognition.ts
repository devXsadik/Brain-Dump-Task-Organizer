export function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isSpeechSupported() {
  return !!getSpeechRecognition();
}

export function buildTranscript(e: SpeechRecognitionEvent) {
  let interim = '';
  let final = '';
  let newFinal = '';

  for (let i = 0; i < e.results.length; i++) {
    const chunk = e.results[i][0].transcript;
    if (e.results[i].isFinal) final += chunk;
    else interim += chunk;
  }

  for (let i = e.resultIndex; i < e.results.length; i++) {
    if (e.results[i].isFinal) newFinal += e.results[i][0].transcript;
  }

  return {
    display: (final + interim).trim(),
    final: final.trim(),
    interim: interim.trim(),
    newFinal: newFinal.trim(),
    lastIsFinal: e.results.length > 0 && e.results[e.results.length - 1].isFinal,
  };
}
