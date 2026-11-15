interface Note {
  frequencyHz: number;
  offsetSeconds: number;
  ringSeconds: number;
}

const FADE_IN_SECONDS = 0.01;
const SILENT_GAIN = 0.0001;
const FUNDAMENTAL_GAIN = 0.1;
const OVERTONE_GAIN = 0.03;

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;
const E6 = 1318.51;

const ARPEGGIO_STEP_SECONDS = 0.16;
const ARPEGGIO_RING_SECONDS = 1;
const FINAL_CHORD_OFFSET_SECONDS = 1.2;
const FINAL_CHORD_RING_SECONDS = 1.6;

/** A rising arpeggio, then a bright chord that rings out: about three seconds in total. */
const MELODY: Note[] = [
  ...[C5, E5, G5, C6].map((frequencyHz, index) => ({
    frequencyHz,
    offsetSeconds: index * ARPEGGIO_STEP_SECONDS,
    ringSeconds: ARPEGGIO_RING_SECONDS,
  })),
  ...[C5, G5, C6, E6].map((frequencyHz) => ({
    frequencyHz,
    offsetSeconds: FINAL_CHORD_OFFSET_SECONDS,
    ringSeconds: FINAL_CHORD_RING_SECONDS,
  })),
];

let audioContext: AudioContext | null = null;

/** Creates or resumes the shared AudioContext. Call from a user gesture. */
export function unlockChime(): void {
  try {
    if (!audioContext) {
      if (!window.AudioContext) {
        return;
      }
      audioContext = new window.AudioContext();
    }
    if (audioContext.state === 'suspended') {
      void audioContext.resume().catch(() => {
        // Unlocking is best-effort; the chime stays silent if the browser refuses.
      });
    }
  } catch {
    // Audio is best-effort; a failure must never break the caller.
  }
}

function playPartial(
  context: AudioContext,
  frequencyHz: number,
  peakGain: number,
  start: number,
  ringSeconds: number
): void {
  const end = start + ringSeconds;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequencyHz;
  gain.gain.setValueAtTime(SILENT_GAIN, start);
  gain.gain.linearRampToValueAtTime(peakGain, start + FADE_IN_SECONDS);
  gain.gain.exponentialRampToValueAtTime(SILENT_GAIN, end);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(end);
}

/** Plays the completion melody. Does nothing when audio is unavailable or still locked. */
export function playChime(): void {
  try {
    const context = audioContext;
    if (!context || context.state !== 'running') {
      return;
    }
    const now = context.currentTime;
    MELODY.forEach(({ frequencyHz, offsetSeconds, ringSeconds }) => {
      const start = now + offsetSeconds;
      playPartial(context, frequencyHz, FUNDAMENTAL_GAIN, start, ringSeconds);
      playPartial(context, frequencyHz * 2, OVERTONE_GAIN, start, ringSeconds * 0.5);
    });
  } catch {
    // Audio is best-effort; a failure must never break the caller.
  }
}

/** Plays the chime from a user gesture, waiting for the context to unlock first. */
export function previewChime(): void {
  try {
    unlockChime();
    void audioContext?.resume().then(playChime, () => {
      // Previewing is best-effort; the chime stays silent if the browser refuses.
    });
  } catch {
    // Audio is best-effort; a failure must never break the caller.
  }
}
