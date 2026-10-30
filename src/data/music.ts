/**
 * Musique composée en code (synthèse Web Audio) : 100 % originale, aucun fichier, aucune licence.
 * Motifs sur 16 pas par mesure ; un caractère = un pas ('.' = silence).
 */
/** Chaque biome a son thème, et une version « boss » du même thème (même tonalité, mêmes accords, plus intense). */
export type TrackId =
  | 'hub'
  | 'merchant'
  | 'lowtown'
  | 'lowtownBoss'
  | 'frost'
  | 'frostBoss'
  | 'olympus'
  | 'olympusBoss'
  | 'aviary'
  | 'aviaryBoss';

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
  // Le Comptoir de Ratatosk : majeur, sautillant, un peu malicieux.
  merchant: {
    bpm: 104,
    rootHz: 130.81, // do
    progression: [0, 5, -3, 7],
    chord: [0, 4, 7, 12, 16],
    bass: 'x...x.x.x...x.x.',
    arp: '0.2.1.3.2.4.3.1.',
    kick: 'x.......x.......',
    hat: '..x...x...x...xx',
    pad: false,
    mix: { bass: 0.45, arp: 0.3, kick: 0.35, hat: 0.1, pad: 0 },
  },
  // Les Bas-Fonds : pulsation régulière, basse qui avance.
  lowtown: {
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
  // Ammit : le thème des Bas-Fonds en double vitesse, basse martelée.
  lowtownBoss: {
    bpm: 134,
    rootHz: 110,
    progression: [0, 0, -4, -2],
    chord: MINOR7,
    bass: 'xxx.xxx.xxx.x.x.',
    arp: '0121013101210131',
    kick: 'x..x..x.x..x..x.',
    hat: 'x.xxx.xxx.xxx.xx',
    pad: true,
    mix: { bass: 0.6, arp: 0.22, kick: 0.7, hat: 0.14, pad: 0.16 },
  },
  // L'Olympe Corporatif : marche solennelle, accords de quinte, cloches d'ascenseur.
  olympus: {
    bpm: 116,
    rootHz: 146.83, // ré
    progression: [0, 5, 3, -2],
    chord: [0, 7, 10, 15, 19],
    bass: 'x...x.x.x...x.x.',
    arp: '0.4.2.4.1.4.3.4.',
    kick: 'x.......x...x...',
    hat: '....x.......x...',
    pad: true,
    mix: { bass: 0.5, arp: 0.2, kick: 0.6, hat: 0.16, pad: 0.24 },
  },
  // Talos : le thème de l'Olympe, plus rapide, martelé comme une forge.
  olympusBoss: {
    bpm: 138,
    rootHz: 146.83,
    progression: [0, 5, 3, -2],
    chord: [0, 7, 10, 15, 19],
    bass: 'x.xxx.xxx.xxx.xx',
    arp: '0424142434240424',
    kick: 'x..xx..xx..xx..x',
    hat: '..x...x...x...x.',
    pad: true,
    mix: { bass: 0.58, arp: 0.2, kick: 0.7, hat: 0.14, pad: 0.18 },
  },
  // La Volière : boîte à musique inquiétante, chants d'oiseaux (arpège aigu), basse lente.
  aviary: {
    bpm: 98,
    rootHz: 82.41, // mi
    progression: [0, 1, -4, -1],
    chord: [0, 3, 7, 11, 14],
    bass: 'x.......x...x...',
    arp: '0.2.3.4.3.2.1.2.',
    kick: 'x.......x.......',
    hat: '..x...x...x...x.',
    pad: true,
    mix: { bass: 0.55, arp: 0.24, kick: 0.45, hat: 0.1, pad: 0.26 },
  },
  // L'Oiseleur : le thème de la Volière, rapide et oppressant.
  aviaryBoss: {
    bpm: 140,
    rootHz: 82.41,
    progression: [0, 1, -4, -1],
    chord: [0, 3, 7, 11, 14],
    bass: 'xx.xxx.xxx.xxx.x',
    arp: '0234320102343212',
    kick: 'x..x..x.x..x..xx',
    hat: 'x.xxx.xxx.xxx.xx',
    pad: true,
    mix: { bass: 0.6, arp: 0.22, kick: 0.72, hat: 0.13, pad: 0.2 },
  },
  // Fenrir-Ω : le thème du Givre-Serveur, plus rapide, arpège continu.
  frostBoss: {
    bpm: 128,
    rootHz: 123.47,
    progression: [0, -3, -5, -2],
    chord: [0, 3, 7, 10, 14],
    bass: 'x.x.x.x.x.x.x.xx',
    arp: '0242134302421343',
    kick: 'x...x..xx...x..x',
    hat: '.xxx.xxx.xxx.xxx',
    pad: true,
    mix: { bass: 0.58, arp: 0.22, kick: 0.65, hat: 0.12, pad: 0.18 },
  },
};
