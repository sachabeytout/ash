import { settings } from '../../core/settings';
import { TRACKS, type TrackDef, type TrackId } from '../../data/music';
import { audioContext, onAudioReset, sharedNoise } from './sfx';

const LOOKAHEAD_S = 0.12;
const TICK_MS = 25;
const FADE_S = 0.8;
/** Volume global de la musique (elle reste sous les bruitages). */
const MUSIC_LEVEL = 0.32;

interface Playing {
  id: TrackId;
  def: TrackDef;
  out: GainNode;
  nextTime: number;
  step: number;
}

/**
 * Lecteur de musique : un séquenceur qui programme les notes un peu à l'avance (lecture régulière
 * même si une frame est lente). Changer de morceau fait un fondu enchaîné.
 */
class MusicPlayer {
  private playing: Playing | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  play(id: TrackId): void {
    const ctx = audioContext();
    if (!ctx) return;
    if (this.playing?.id === id) return;
    this.fadeOut();
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.exponentialRampToValueAtTime(this.level(), ctx.currentTime + FADE_S);
    out.connect(ctx.destination);
    this.playing = { id, def: TRACKS[id], out, nextTime: ctx.currentTime + 0.05, step: 0 };
    this.timer ??= setInterval(() => this.tick(), TICK_MS);
  }

  /** Le contexte audio a été recréé : on relance le même morceau dessus. */
  restart(): void {
    const id = this.playing?.id;
    this.playing = null;
    if (id) this.play(id);
  }

  stop(): void {
    this.fadeOut();
    this.playing = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private level(): number {
    return Math.max(0.0001, settings.masterVolume * settings.musicVolume * MUSIC_LEVEL);
  }

  private fadeOut(): void {
    const ctx = audioContext();
    const p = this.playing;
    if (!ctx || !p) return;
    p.out.gain.cancelScheduledValues(ctx.currentTime);
    p.out.gain.setValueAtTime(Math.max(0.0001, p.out.gain.value), ctx.currentTime);
    p.out.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + FADE_S);
    const out = p.out;
    setTimeout(() => out.disconnect(), FADE_S * 1000 + 200);
  }

  private tick(): void {
    const ctx = audioContext();
    const p = this.playing;
    if (!ctx || !p || ctx.state !== 'running') return;
    // Après une coupure (bouton silencieux, appel…), on reprend au présent sans rattraper le retard.
    if (p.nextTime < ctx.currentTime - 0.25) p.nextTime = ctx.currentTime + 0.05;
    // Le volume suit les options en direct.
    p.out.gain.setTargetAtTime(this.level(), ctx.currentTime, 0.1);
    const stepS = stepSeconds(p.def);
    while (p.nextTime < ctx.currentTime + LOOKAHEAD_S) {
      scheduleStep(ctx, p.out, p.def, p.step, p.nextTime, sharedNoise());
      p.nextTime += stepS;
      p.step++;
    }
  }
}

/** Durée d'un pas (une double croche). */
export function stepSeconds(def: TrackDef): number {
  return 60 / def.bpm / 4;
}

/**
 * Programme toutes les notes d'un pas. Fonction autonome : le lecteur l'appelle en direct, et un
 * rendu hors ligne (vérification, écoute) peut l'appeler sur un `OfflineAudioContext`.
 */
export function scheduleStep(
  ctx: BaseAudioContext,
  out: AudioNode,
  def: TrackDef,
  step: number,
  t: number,
  noise: AudioBuffer | null,
): void {
  const stepS = stepSeconds(def);
  const i = step % 16;
  const barIndex = Math.floor(step / 16);
  const bar = barIndex % def.progression.length;
  const root = def.rootHz * 2 ** ((def.progression[bar] ?? 0) / 12);
  if (def.bass[i] === 'x') voice(ctx, out, 'sawtooth', root / 2, t, stepS * 1.8, def.mix.bass, 600);
  const arp = def.arp[i];
  if (arp && arp !== '.') {
    const f = root * 2 * 2 ** ((def.chord[Number(arp)] ?? 0) / 12);
    if (def.arpVoice === 'pluck') pluck(ctx, out, f, t, def.mix.arp);
    else voice(ctx, out, 'triangle', f, t, stepS * 1.5, def.mix.arp, 3000);
  }
  if (def.kick[i] === 'x') kick(ctx, out, t, def.mix.kick);
  if (def.hat[i] === 'x' && noise) hat(ctx, out, t, def.mix.hat, noise);
  const drum = def.darbuka?.[i];
  if (drum === 'D') doum(ctx, out, t, def.mix.darbuka ?? 0);
  else if ((drum === 'T' || drum === 'k') && noise)
    tek(ctx, out, t, (def.mix.darbuka ?? 0) * (drum === 'T' ? 0.7 : 0.35), noise);
  if (def.sistrum?.[i] === 's' && noise) sistrum(ctx, out, t, def.mix.sistrum ?? 0, noise);
  if (i === 0) {
    const barS = stepS * 16;
    if (def.pad) {
      for (const semis of def.chord.slice(0, 3)) {
        const f = root * 2 ** (semis / 12);
        voice(ctx, out, 'sawtooth', f, t, barS, def.mix.pad / 3, 900, 0.4, 1.003);
      }
    }
    // Bourdon : la tonique et sa quinte, tenues (le vent du désert), sans suivre les accords.
    if (def.drone) {
      for (const ratio of [0.5, 0.75]) {
        voice(
          ctx,
          out,
          'sawtooth',
          def.rootHz * ratio,
          t,
          barS * 1.05,
          (def.mix.drone ?? 0) / 2,
          420,
          0.6,
          1.004,
        );
      }
    }
  }
  // Mélodie (flûte de roseau) : un chiffre = degré de la gamme, '-' prolonge la note, '.' = silence.
  const melody = def.melody?.[barIndex % def.melody.length];
  const note = melody?.[i];
  if (melody && note && note !== '.' && note !== '-' && def.scale) {
    let len = 1;
    while (melody[i + len] === '-') len++;
    const degree = parseInt(note, 36);
    const octave = Math.floor(degree / def.scale.length);
    const semis = (def.scale[degree % def.scale.length] ?? 0) + 12 * octave;
    const f = def.rootHz * 2 ** (def.melodyOctave ?? 2) * 2 ** (semis / 12);
    ney(ctx, out, f, t, stepS * len, def.mix.melody ?? 0);
  }
}

/** Une note : oscillateur → filtre passe-bas → enveloppe. */
function voice(
  ctx: BaseAudioContext,
  out: AudioNode,
  type: OscillatorType,
  freq: number,
  t: number,
  dur: number,
  gain: number,
  cutoff: number,
  attack = 0.008,
  detune = 1,
): void {
  if (gain <= 0) return;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = cutoff;
  f.connect(g).connect(out);
  for (const d of detune === 1 ? [1] : [1, detune]) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq * d;
    o.connect(f);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}

/** Corde pincée (harpe, luth) : le filtre se referme vite après l'attaque. */
function pluck(ctx: BaseAudioContext, out: AudioNode, freq: number, t: number, gain: number): void {
  if (gain <= 0) return;
  const dur = 0.55;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(Math.min(5000, freq * 8), t);
  f.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 1.2), t + 0.25);
  f.connect(g).connect(out);
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = freq;
  o.connect(f);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** Flûte de roseau (ney) : attaque soufflée, vibrato qui arrive après un instant, souffle léger. */
function ney(
  ctx: BaseAudioContext,
  out: AudioNode,
  freq: number,
  t: number,
  dur: number,
  gain: number,
): void {
  if (gain <= 0) return;
  const end = t + Math.max(0.12, dur * 0.95);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.07);
  g.gain.setValueAtTime(gain, Math.max(t + 0.07, end - 0.12));
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = Math.min(4000, freq * 4);
  f.connect(g).connect(out);
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(freq * 0.985, t);
  o.frequency.exponentialRampToValueAtTime(freq, t + 0.06);
  // Vibrato : 5,5 Hz, qui s'installe doucement.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.5;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0, t);
  depth.gain.linearRampToValueAtTime(freq * 0.008, Math.min(end, t + 0.35));
  lfo.connect(depth).connect(o.frequency);
  const sine = ctx.createOscillator();
  sine.frequency.value = freq * 2;
  const sineGain = ctx.createGain();
  sineGain.gain.value = 0.25;
  sine.connect(sineGain).connect(f);
  o.connect(f);
  for (const osc of [o, lfo, sine]) {
    osc.start(t);
    osc.stop(end + 0.05);
  }
}

function kick(ctx: BaseAudioContext, out: AudioNode, t: number, gain: number): void {
  if (gain <= 0) return;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.25);
}

/** Darbouka, coup grave (« doum ») : peau tendue, hauteur qui tombe. */
function doum(ctx: BaseAudioContext, out: AudioNode, t: number, gain: number): void {
  if (gain <= 0) return;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(190, t);
  o.frequency.exponentialRampToValueAtTime(95, t + 0.12);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.35);
}

/** Darbouka, coup claquant sur le bord (« tek ») : bruit bref et aigu, petit claquement. */
function tek(
  ctx: BaseAudioContext,
  out: AudioNode,
  t: number,
  gain: number,
  noise: AudioBuffer,
): void {
  if (gain <= 0) return;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 3200;
  f.Q.value = 1.4;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  src.connect(f).connect(g).connect(out);
  src.start(t, (t * 7.31) % 0.5);
  src.stop(t + 0.09);
  const o = ctx.createOscillator();
  o.frequency.value = 820;
  const og = ctx.createGain();
  og.gain.setValueAtTime(gain * 0.35, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  o.connect(og).connect(out);
  o.start(t);
  o.stop(t + 0.04);
}

/** Sistre : hochet sacré, des petites plaques de métal qui frémissent. */
function sistrum(
  ctx: BaseAudioContext,
  out: AudioNode,
  t: number,
  gain: number,
  noise: AudioBuffer,
): void {
  if (gain <= 0) return;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 7500;
  f.Q.value = 3;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  src.connect(f).connect(g).connect(out);
  src.start(t, (t * 3.17) % 0.5);
  src.stop(t + 0.18);
}

function hat(
  ctx: BaseAudioContext,
  out: AudioNode,
  t: number,
  gain: number,
  noise: AudioBuffer,
): void {
  if (gain <= 0) return;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 7000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  src.connect(f).connect(g).connect(out);
  src.start(t, (t * 5.13) % 0.5);
  src.stop(t + 0.07);
}

export const music = new MusicPlayer();
onAudioReset(() => music.restart());
