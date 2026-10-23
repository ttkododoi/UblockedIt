let ctx: AudioContext | null = null;
let enabled = true;
let volume = 0.18;

function getCtx() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

export function setSoundVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
}

type Voice = {
  freq: number;
  endFreq?: number;
  type?: OscillatorType;
  dur?: number;
  gain?: number;
  delay?: number;
};

function tone({ freq, endFreq, type = 'sine', dur = 0.12, gain = 1, delay = 0 }: Voice) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(volume * gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  hover: () => tone({ freq: 1180, endFreq: 1420, type: 'sine', dur: 0.035, gain: 0.25 }),
  tap: () => tone({ freq: 620, endFreq: 880, type: 'triangle', dur: 0.07, gain: 0.5 }),
  open: () => {
    tone({ freq: 420, endFreq: 780, type: 'sine', dur: 0.16, gain: 0.5 });
    tone({ freq: 620, endFreq: 1180, type: 'sine', dur: 0.18, gain: 0.3, delay: 0.04 });
  },
  close: () => {
    tone({ freq: 720, endFreq: 320, type: 'sine', dur: 0.15, gain: 0.35 });
  },
  success: () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
      tone({ freq, type: 'sine', dur: 0.28, gain: 0.36, delay: i * 0.065 })
    );
  },
  error: () => {
    tone({ freq: 240, endFreq: 140, type: 'sawtooth', dur: 0.2, gain: 0.22 });
  },
  swoosh: () => tone({ freq: 900, endFreq: 220, type: 'sine', dur: 0.22, gain: 0.2 }),
  power: () => {
    [220, 330, 440, 660].forEach((freq, i) =>
      tone({ freq, endFreq: freq * 1.5, type: 'triangle', dur: 0.35, gain: 0.14, delay: i * 0.07 })
    );
  },
};
