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
    const stepS = 60 / p.def.bpm / 4;
    while (p.nextTime < ctx.currentTime + LOOKAHEAD_S) {
      this.scheduleStep(ctx, p, p.nextTime, stepS);
      p.nextTime += stepS;
      p.step++;
    }
  }

  private scheduleStep(ctx: AudioContext, p: Playing, t: number, stepS: number): void {
    const def = p.def;
    const i = p.step % 16;
    const bar = Math.floor(p.step / 16) % def.progression.length;
    const root = def.rootHz * 2 ** ((def.progression[bar] ?? 0) / 12);
    if (def.bass[i] === 'x')
      this.voice(ctx, p.out, 'sawtooth', root / 2, t, stepS * 1.8, def.mix.bass, 600);
    const arp = def.arp[i];
    if (arp && arp !== '.') {
      const semis = def.chord[Number(arp)] ?? 0;
      this.voice(
        ctx,
        p.out,
        'triangle',
        root * 2 * 2 ** (semis / 12),
        t,
        stepS * 1.5,
        def.mix.arp,
        3000,
      );
    }
    if (def.kick[i] === 'x') this.kick(ctx, p.out, t, def.mix.kick);
    if (def.hat[i] === 'x') this.hat(ctx, p.out, t, def.mix.hat);
    if (def.pad && i === 0) {
      const barS = stepS * 16;
      for (const semis of def.chord.slice(0, 3)) {
        const f = root * 2 ** (semis / 12);
        this.voice(ctx, p.out, 'sawtooth', f, t, barS, def.mix.pad / 3, 900, 0.4, 1.003);
      }
    }
  }

  /** Une note : oscillateur → filtre passe-bas → enveloppe. */
  private voice(
    ctx: AudioContext,
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

  private kick(ctx: AudioContext, out: AudioNode, t: number, gain: number): void {
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

  private hat(ctx: AudioContext, out: AudioNode, t: number, gain: number): void {
    const noise = sharedNoise();
    if (gain <= 0 || !noise) return;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + 0.07);
  }
}

export const music = new MusicPlayer();
onAudioReset(() => music.restart());
