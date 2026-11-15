import { afterEach, describe, expect, it, vi } from 'vitest';

interface FakeOscillator {
  type: string;
  frequency: { value: number };
  endTime?: number;
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

interface FakeOptions {
  initialState: 'running' | 'suspended';
  resumes?: boolean;
  throwOnOscillator?: boolean;
}

function installFakeAudioContext({
  initialState,
  resumes = true,
  throwOnOscillator = false,
}: FakeOptions) {
  const oscillators: FakeOscillator[] = [];

  class FakeAudioContext {
    state = initialState;
    currentTime = 10;
    destination = {};
    resume = vi.fn(() => {
      if (resumes) {
        this.state = 'running';
      }
      return Promise.resolve();
    });
    createOscillator() {
      if (throwOnOscillator) {
        throw new Error('audio failure');
      }
      const oscillator: FakeOscillator = {
        type: 'square',
        frequency: { value: 0 },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn((time: number) => {
          oscillator.endTime = time;
        }),
      };
      oscillators.push(oscillator);
      return oscillator;
    }
    createGain() {
      return {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
    }
  }

  vi.stubGlobal('AudioContext', FakeAudioContext);
  return { oscillators };
}

async function loadChime() {
  vi.resetModules();
  return import('./chime');
}

describe('chime', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should not start an oscillator before unlockChime', async () => {
    const { oscillators } = installFakeAudioContext({ initialState: 'running' });
    const { playChime } = await loadChime();

    playChime();

    expect(oscillators).toHaveLength(0);
  });

  it('should not start an oscillator while the context stays suspended', async () => {
    const { oscillators } = installFakeAudioContext({ initialState: 'suspended', resumes: false });
    const { unlockChime, playChime } = await loadChime();

    unlockChime();
    playChime();

    expect(oscillators).toHaveLength(0);
  });

  it('should play a melody that lasts between two and three seconds', async () => {
    const { oscillators } = installFakeAudioContext({ initialState: 'running' });
    const { unlockChime, playChime } = await loadChime();

    unlockChime();
    playChime();

    const lastEnd = Math.max(...oscillators.map((oscillator) => oscillator.endTime ?? 0));
    expect(lastEnd - 10).toBeGreaterThanOrEqual(2);
    expect(lastEnd - 10).toBeLessThanOrEqual(3);
    expect(oscillators.every((oscillator) => oscillator.type === 'sine')).toBe(true);
  });

  it('should stagger note starts so it reads as a melody, not one tone', async () => {
    const { oscillators } = installFakeAudioContext({ initialState: 'running' });
    const { unlockChime, playChime } = await loadChime();

    unlockChime();
    playChime();

    const starts = new Set(oscillators.map((oscillator) => oscillator.start.mock.calls[0][0]));
    expect(starts.size).toBeGreaterThanOrEqual(5);
  });

  it('should resume a suspended context so the next chime plays', async () => {
    const { oscillators } = installFakeAudioContext({ initialState: 'suspended' });
    const { unlockChime, playChime } = await loadChime();

    unlockChime();
    await Promise.resolve();
    playChime();

    expect(oscillators.length).toBeGreaterThan(0);
  });

  it('should play from a locked state when previewed', async () => {
    const { oscillators } = installFakeAudioContext({ initialState: 'suspended' });
    const { previewChime } = await loadChime();

    previewChime();
    await Promise.resolve();
    await Promise.resolve();

    expect(oscillators.length).toBeGreaterThan(0);
  });

  it('should swallow errors thrown while scheduling', async () => {
    installFakeAudioContext({ initialState: 'running', throwOnOscillator: true });
    const { unlockChime, playChime } = await loadChime();

    unlockChime();

    expect(() => {
      playChime();
    }).not.toThrow();
  });
});
