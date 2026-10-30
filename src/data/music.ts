/**
 * Musique composée en code (synthèse Web Audio) : 100 % originale, aucun fichier, aucune licence.
 * Motifs sur 16 pas par mesure ; un caractère = un pas ('.' = silence).
 */
export type TrackId = 'hub' | 'combat' | 'frost' | 'boss';

export interface TrackDef {
  bpm: number;
  /** Note de base (Hz) : la tonalité. */
  rootHz: number;
  /** Fondamentale de chaque mesure, en demi-tons depuis la note de base (les mesures bouclent). */
  progression: readonly number[];
  /** Accord joué sur chaque mesure (demi-tons depuis la fondamentale). */
  chord: readonly number[];
  /** Basse : 'x' = note. */
  bass: string;
  /** Arpège : chiffre = rang dans l'accord, une octave au-dessus. */
  arp: string;
  kick: string;
  hat: string;
  /** Nappe tenue sur chaque mesure. */
  pad: boolean;
  /** Volume relatif de chaque couche. */
  mix: { bass: number; arp: number; kick: number; hat: number; pad: number };
}

const MINOR7 = [0, 3, 7, 10, 12] as const;

export const TRACKS: Record<TrackId, TrackDef> = {
  // La Cage : lente, en suspens, les braises qui montent.
  hub: {
    bpm: 66,
    rootHz: 110, // la
    progression: [0, -4, 3, -2],
    chord: MINOR7,
    bass: 'x.......x.......',
    arp: '0...2...1...3...',
    kick: '................',
    hat: '................',
    pad: true,
    mix: { bass: 0.5, arp: 0.35, kick: 0, hat: 0, pad: 0.4 },
  },
  // Combat : pulsation régulière, basse qui avance.
  combat: {
    bpm: 112,
    rootHz: 110,
    progression: [0, 0, -4, -2],
    chord: MINOR7,
    bass: 'x.x.x..xx.x.x..x',
    arp: '0.1.2.1.0.1.3.1.',
    kick: 'x...x...x...x...',
    hat: '..x...x...x...xx',
    pad: true,
    mix: { bass: 0.55, arp: 0.22, kick: 0.6, hat: 0.18, pad: 0.18 },
  },
  // Givre-Serveur : cristallin, arpège qui scintille, ventilateurs (charleston serré).
  frost: {
    bpm: 104,
    rootHz: 123.47, // si
    progression: [0, -3, -5, -2],
    chord: [0, 3, 7, 10, 14],
    bass: 'x.....x.x.....x.',
    arp: '0.2.4.2.1.3.4.3.',
    kick: 'x.......x..x....',
    hat: 'x.x.x.x.x.x.x.x.',
    pad: true,
    mix: { bass: 0.5, arp: 0.24, kick: 0.5, hat: 0.1, pad: 0.22 },
  },
  // Les boss : plus rapide, demi-ton menaçant (couleur phrygienne).
  boss: {
    bpm: 132,
    rootHz: 98, // sol
    progression: [0, 1, 0, -2],
    chord: [0, 3, 7, 8, 12],
    bass: 'xxx.xxx.xxx.x.x.',
    arp: '0123012301230124',
    kick: 'x..x..x.x..x..x.',
    hat: 'x.xxx.xxx.xxx.xx',
    pad: true,
    mix: { bass: 0.6, arp: 0.2, kick: 0.7, hat: 0.14, pad: 0.15 },
  },
};
