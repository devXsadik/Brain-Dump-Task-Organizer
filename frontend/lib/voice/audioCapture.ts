/** Record short utterances via MediaRecorder for Whisper fallback. */

export type AudioCaptureResult = {
  blob: Blob;
  mimetype: string;
};

const SILENCE_MS = 1400;
const MAX_MS = 30000;

export async function captureUtterance(signal?: AbortSignal): Promise<AudioCaptureResult> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm';

  return new Promise((resolve, reject) => {
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    let maxTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const cleanup = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (silenceTimer) clearTimeout(silenceTimer);
      if (maxTimer) clearTimeout(maxTimer);
    };

    const finish = () => {
      if (stopped) return;
      stopped = true;
      cleanup();
      const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
      resolve({ blob, mimetype: mimeType.split(';')[0] });
    };

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = finish;
    recorder.onerror = () => {
      cleanup();
      reject(new Error('Recording failed'));
    };

    signal?.addEventListener('abort', () => {
      try {
        recorder.stop();
      } catch {
        cleanup();
        reject(new Error('Recording aborted'));
      }
    });

    recorder.start(250);
    maxTimer = setTimeout(() => {
      try {
        recorder.stop();
      } catch {
        finish();
      }
    }, MAX_MS);

  });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const data = reader.result as string;
      const base64 = data.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Push-to-talk capture: stops after silence or manual stop. */
export async function captureUntilSilence(): Promise<AudioCaptureResult> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm';

  return new Promise((resolve, reject) => {
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    let maxTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const cleanup = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (silenceTimer) clearTimeout(silenceTimer);
      if (maxTimer) clearTimeout(maxTimer);
    };

    const finish = () => {
      if (stopped) return;
      stopped = true;
      cleanup();
      resolve({ blob: new Blob(chunks, { type: mimeType.split(';')[0] }), mimetype: mimeType.split(';')[0] });
    };

    const armSilence = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        try {
          recorder.stop();
        } catch {
          finish();
        }
      }, SILENCE_MS);
    };

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
        armSilence();
      }
    };
    recorder.onstop = finish;
    recorder.onerror = () => {
      cleanup();
      reject(new Error('Recording failed'));
    };

    recorder.start(200);
    armSilence();
    maxTimer = setTimeout(() => {
      try {
        recorder.stop();
      } catch {
        finish();
      }
    }, MAX_MS);
  });
}
