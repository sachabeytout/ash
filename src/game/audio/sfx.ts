import { settings } from '../../core/settings';

/**
 * Bruitages synthétisés en direct (Web Audio) : aucun fichier à charger, aucune licence.
 * L'audio doit être débloqué par un premier toucher (exigence iOS) : voir `unlockAudio`.
 */
let ctx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
const lastPlayed = new Map<string, number>();

export function unlockAudio(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    if (!noiseBuffer) {
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
  } catch {
    ctx = null; // Pas d'audio disponible : le jeu continue en silence.
  }
}

/** Contexte audio partagé avec la musique (null tant que l'audio n'est pas débloqué). */
export function audioContext(): AudioContext | null {
  return ctx;
}

export function sharedNoise(): AudioBuffer | null {
  return noiseBuffer;
}

function volume(): number {
  return settings.masterVolume * settings.sfxVolume;
}

/** Évite d'empiler le même son plusieurs fois dans la même frame. */
function throttle(name: string, ms = 30): boolean {
  if (!ctx) return false;
  const now = ctx.currentTime * 1000;
  if (now - (lastPlayed.get(name) ?? -Infinity) < ms) return false;
  lastPlayed.set(name, now);
  return true;
}

function envelope(gainValue: number, duration: number): GainNode | null {
  if (!ctx) return null;
  const g = ctx.createGain();
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainValue * volume()), t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  g.connect(ctx.destination);
  return g;
}

function tone(
  type: OscillatorType,
  from: number,
  to: number,
  duration: number,
  gain: number,
): void {
  const g = envelope(gain, duration);
  if (!ctx || !g) return;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, to), ctx.currentTime + duration);
  o.connect(g);
  o.start();
  o.stop(ctx.currentTime + duration + 0.02);
}

function noise(
  filter: BiquadFilterType,
  from: number,
  to: number,
  duration: number,
  gain: number,
): void {
  const g = envelope(gain, duration);
  if (!ctx || !g || !noiseBuffer) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.Q.value = 0.8;
  f.frequency.setValueAtTime(from, ctx.currentTime);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, to), ctx.currentTime + duration);
  src.connect(f).connect(g);
  src.start(0, Math.random() * 0.5);
  src.stop(ctx.currentTime + duration + 0.02);
}

export const sfx = {
  swing(heavy = false) {
    if (!throttle('swing')) return;
    noise(
      'bandpass',
      heavy ? 1800 : 2600,
      heavy ? 500 : 900,
      heavy ? 0.16 : 0.09,
      heavy ? 0.5 : 0.35,
    );
  },
  hit(heavy = false) {
    if (!throttle('hit')) return;
    tone('square', heavy ? 160 : 220, 50, heavy ? 0.16 : 0.1, 0.35);
    noise('lowpass', 3000, 300, 0.08, 0.5);
  },
  kill() {
    if (!throttle('kill', 60)) return;
    tone('sawtooth', 300, 40, 0.25, 0.25);
    noise('lowpass', 2000, 100, 0.25, 0.4);
  },
  dash() {
    if (!throttle('dash')) return;
    noise('bandpass', 600, 2400, 0.14, 0.4);
  },
  hurt() {
    if (!throttle('hurt', 80)) return;
    tone('square', 420, 90, 0.22, 0.4);
    noise('lowpass', 1200, 200, 0.18, 0.35);
  },
  /** Signal sonore d'une attaque ennemie qui se prépare (complète le télégraphe visuel). */
  telegraph() {
    if (!throttle('telegraph', 90)) return;
    tone('triangle', 520, 880, 0.18, 0.12);
  },
  shoot() {
    if (!throttle('shoot', 50)) return;
    tone('square', 900, 300, 0.09, 0.15);
  },
  spawn() {
    if (!throttle('spawn', 80)) return;
    tone('sine', 200, 420, 0.3, 0.12);
  },
  door() {
    if (!throttle('door', 200)) return;
    tone('triangle', 330, 660, 0.25, 0.25);
    tone('triangle', 495, 990, 0.35, 0.18);
  },
  clear() {
    if (!throttle('clear', 300)) return;
    tone('triangle', 392, 784, 0.4, 0.2);
    tone('sine', 523, 1046, 0.6, 0.15);
  },
  boonOffer() {
    if (!throttle('boonOffer', 300)) return;
    tone('sine', 523, 784, 0.5, 0.18);
    tone('triangle', 659, 1318, 0.7, 0.12);
  },
  boonTaken() {
    if (!throttle('boonTaken', 200)) return;
    tone('triangle', 392, 1568, 0.45, 0.25);
    noise('highpass', 2000, 6000, 0.3, 0.15);
  },
  burn() {
    if (!throttle('burn', 120)) return;
    noise('lowpass', 900, 300, 0.12, 0.18);
  },
  zap() {
    if (!throttle('zap', 60)) return;
    noise('highpass', 5000, 1500, 0.12, 0.3);
    tone('square', 1200, 400, 0.08, 0.12);
  },
  freeze() {
    if (!throttle('freeze', 100)) return;
    tone('sine', 1800, 2600, 0.2, 0.15);
    noise('highpass', 4000, 8000, 0.15, 0.2);
  },
  explode() {
    if (!throttle('explode', 80)) return;
    tone('sawtooth', 140, 40, 0.35, 0.3);
    noise('lowpass', 2500, 80, 0.4, 0.5);
  },
  super() {
    if (!throttle('super', 300)) return;
    tone('sawtooth', 110, 880, 0.5, 0.22);
    tone('triangle', 220, 1760, 0.6, 0.18);
    noise('bandpass', 400, 4000, 0.5, 0.35);
  },
  superReady() {
    if (!throttle('superReady', 500)) return;
    tone('sine', 880, 1320, 0.25, 0.14);
  },
  tap() {
    if (!throttle('tap', 60)) return;
    tone('sine', 660, 880, 0.06, 0.15);
  },
};
