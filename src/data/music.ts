/**
 * Musique composée en code (synthèse Web Audio) : 100 % originale, aucun fichier, aucune licence.
 * Motifs sur 16 pas par mesure ; un caractère = un pas ('.' = silence).
 * Depuis la 0.56.0 : couleur égyptienne (gammes orientales, darbouka, sistre, flûte de roseau, bourdon).
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
  /** Timbre de l'arpège : 'pluck' = corde pincée (harpe, luth), sinon note douce. */
  arpVoice?: 'pluck';
  /** Darbouka : 'D' = doum (grave), 'T' = tek (claquant), 'k' = tek léger. */
  darbuka?: string;
  /** Sistre (hochet sacré) : 's' = frémissement. */
  sistrum?: string;
  /** Bourdon grave tenu (tonique + quinte). */
  drone?: boolean;
  /** Gamme de la mélodie (demi-tons depuis la note de base). */
  scale?: readonly number[];
  /** Mélodie de flûte de roseau, une chaîne de 16 pas par mesure : chiffre = degré, '-' = tenue. */
  melody?: readonly string[];
  /** Octave de la mélodie au-dessus de la note de base (2 par défaut). */
  melodyOctave?: number;
  /** Volume relatif de chaque couche. */
  mix: {
    bass: number;
    arp: number;
    kick: number;
    hat: number;
    pad: number;
    darbuka?: number;
    sistrum?: number;
    drone?: number;
    melody?: number;
  };
}

/** Hijaz (mode oriental, seconde augmentée) : la, si♭, do♯, ré, mi, fa, sol. */
const HIJAZ = [0, 1, 4, 5, 7, 8, 10] as const;
/** « Double harmonique » : la gamme du désert, deux secondes augmentées. */
const DOUBLE_HARMONIC = [0, 1, 4, 5, 7, 8, 11] as const;
const MAJOR = [0, 4, 7, 12, 16] as const;

/** Rythmes de darbouka (16 pas). */
const MAQSUM = 'D.Tk.kT.D.kkT.k.';
const SAIDI = 'D.T...D.D...T...';
const BALADI = 'D.D...T.D...T.k.';
const AYOUB = 'D.kTD.T.D.kTD.Tk';

// Mélodies (degrés de la gamme ; 7 = octave du 0).
const LOWTOWN_MELODY = [
  '4-5-4-2-1---0---',
  '................',
  '7-6-5-4-5-4-2---',
  '1-2-1-0---------',
];
const NILE_MELODY = [
  '7-------5---4---',
  '5-------4-------',
  '3---4---2---1---',
  '0---------------',
];
const PYRAMID_MELODY = [
  '4---5-4-3---4---',
  '5-6-7---6-5-4---',
  '3-4-3-2-1---2---',
  '0---------------',
  '7---8-7-6---5---',
  '6-5-4---5-4-3---',
  '2-3-2-1-0-1-2---',
  '1---0-----------',
];
const DOUAT_MELODY = [
  '0-------1---2---',
  '3-------2---1---',
  '4---5---4---2---',
  '1-------0-------',
];
const HUB_MELODY = ['4-------3---1---', '2-------1-------', '3---4---5-------', '4---------------'];

export const TRACKS: Record<TrackId, TrackDef> = {
  // La Cage : lente, en suspens ; bourdon, flûte de roseau lointaine, un doum par mesure.
  hub: {
    bpm: 66,
    rootHz: 110, // la
    progression: [0, 0, 1, 0],
    chord: [0, 4, 7, 12, 16],
    bass: 'x.......x.......',
    arp: '0...2...1...3...',
    arpVoice: 'pluck',
    kick: '................',
    hat: '................',
    darbuka: 'D.......k.......',
    sistrum: '........s.......',
    pad: false,
    drone: true,
    scale: HIJAZ,
    melody: HUB_MELODY,
    mix: {
      bass: 0.35,
      arp: 0.22,
      kick: 0,
      hat: 0,
      pad: 0,
      darbuka: 0.35,
      sistrum: 0.05,
      drone: 0.3,
      melody: 0.16,
    },
  },
  // Le Comptoir de Ratatosk : majeur, sautillant, un peu malicieux (il vient d'ailleurs), darbouka maqsoum.
  merchant: {
    bpm: 104,
    rootHz: 130.81, // do
    progression: [0, 5, -3, 7],
    chord: MAJOR,
    bass: 'x...x.x.x...x.x.',
    arp: '0.2.1.3.2.4.3.1.',
    arpVoice: 'pluck',
    kick: '................',
    hat: '..x...x...x...xx',
    darbuka: MAQSUM,
    pad: false,
    mix: { bass: 0.45, arp: 0.28, kick: 0, hat: 0.08, pad: 0, darbuka: 0.45 },
  },
  // Les Bas-Fonds d'Héliopolis : la ville de néon ; pulsation électronique sous un rythme maqsoum, mélodie hijaz.
  lowtown: {
    bpm: 112,
    rootHz: 110, // la
    progression: [0, 0, 1, 0],
    chord: MAJOR,
    bass: 'x.x.x..xx.x.x..x',
    arp: '0.1.2.1.0.1.3.1.',
    arpVoice: 'pluck',
    kick: 'x.......x.......',
    hat: '..x...x...x...x.',
    darbuka: MAQSUM,
    pad: false,
    drone: true,
    scale: HIJAZ,
    melody: LOWTOWN_MELODY,
    mix: {
      bass: 0.5,
      arp: 0.18,
      kick: 0.5,
      hat: 0.1,
      pad: 0,
      darbuka: 0.5,
      drone: 0.18,
      melody: 0.17,
    },
  },
  // Ammit : le thème des Bas-Fonds plus rapide, rythme ayoub qui tourne en transe, basse martelée.
  lowtownBoss: {
    bpm: 134,
    rootHz: 110,
    progression: [0, 0, 1, 0],
    chord: MAJOR,
    bass: 'xxx.xxx.xxx.x.x.',
    arp: '0121013101210131',
    arpVoice: 'pluck',
    kick: 'x...x...x...x...',
    hat: 'x.x.x.x.x.x.x.x.',
    darbuka: AYOUB,
    sistrum: 's...s...s...s...',
    pad: false,
    drone: true,
    scale: HIJAZ,
    melody: LOWTOWN_MELODY,
    mix: {
      bass: 0.55,
      arp: 0.18,
      kick: 0.6,
      hat: 0.1,
      pad: 0,
      darbuka: 0.55,
      sistrum: 0.06,
      drone: 0.2,
      melody: 0.18,
    },
  },
  // Le Nil de minuit : calme et inquiétant ; harpe pincée, flûte, rythme saïdi feutré, sistre.
  frost: {
    bpm: 92,
    rootHz: 123.47, // si
    progression: [0, 1, 0, -2],
    chord: MAJOR,
    bass: 'x.....x.x.....x.',
    arp: '0.2.4.2.1.3.4.3.',
    arpVoice: 'pluck',
    kick: '................',
    hat: '................',
    darbuka: SAIDI,
    sistrum: 's.......s.......',
    pad: false,
    drone: true,
    scale: HIJAZ,
    melody: NILE_MELODY,
    mix: {
      bass: 0.42,
      arp: 0.2,
      kick: 0,
      hat: 0,
      pad: 0,
      darbuka: 0.38,
      sistrum: 0.06,
      drone: 0.26,
      melody: 0.16,
    },
  },
  // Shezmu : le thème du Nil, plus rapide et lourd, doums répétés comme un pressoir.
  frostBoss: {
    bpm: 128,
    rootHz: 123.47,
    progression: [0, 1, 0, -2],
    chord: MAJOR,
    bass: 'x.x.x.x.x.x.x.xx',
    arp: '0242134302421343',
    arpVoice: 'pluck',
    kick: 'x.......x.......',
    hat: '................',
    darbuka: 'D.D.T.k.D.D.T.kk',
    sistrum: 's...s...s...s...',
    pad: false,
    drone: true,
    scale: HIJAZ,
    melody: NILE_MELODY,
    mix: {
      bass: 0.55,
      arp: 0.18,
      kick: 0.55,
      hat: 0,
      pad: 0,
      darbuka: 0.55,
      sistrum: 0.06,
      drone: 0.22,
      melody: 0.17,
    },
  },
  // La Douât : procession lente dans la nuit, doums profonds, flûte grave.
  olympus: {
    bpm: 84,
    rootHz: 73.42, // ré grave
    progression: [0, 0, 1, 0],
    chord: MAJOR,
    bass: 'x.......x...x...',
    arp: '0...2...4...2...',
    arpVoice: 'pluck',
    kick: '................',
    hat: '................',
    darbuka: 'D.......D...D.k.',
    sistrum: '....s.......s...',
    pad: false,
    drone: true,
    scale: HIJAZ,
    melody: DOUAT_MELODY,
    melodyOctave: 3,
    mix: {
      bass: 0.5,
      arp: 0.2,
      kick: 0,
      hat: 0,
      pad: 0,
      darbuka: 0.55,
      sistrum: 0.05,
      drone: 0.32,
      melody: 0.16,
    },
  },
  // Apophis : la procession devient une charge ; rythme ayoub, basse martelée.
  olympusBoss: {
    bpm: 132,
    rootHz: 73.42,
    progression: [0, 0, 1, 0],
    chord: MAJOR,
    bass: 'x.xxx.xxx.xxx.xx',
    arp: '0424142434240424',
    arpVoice: 'pluck',
    kick: 'x...x...x...x...',
    hat: '................',
    darbuka: AYOUB,
    sistrum: 's.s.s.s.s.s.s.s.',
    pad: false,
    drone: true,
    scale: HIJAZ,
    melody: DOUAT_MELODY,
    melodyOctave: 3,
    mix: {
      bass: 0.58,
      arp: 0.18,
      kick: 0.62,
      hat: 0,
      pad: 0,
      darbuka: 0.58,
      sistrum: 0.05,
      drone: 0.26,
      melody: 0.17,
    },
  },
  // La Pyramide aux cages : le thème du désert ; gamme double harmonique, bourdon, baladi, sistre, longue
  // mélodie de flûte (8 mesures).
  aviary: {
    bpm: 100,
    rootHz: 82.41, // mi
    progression: [0, 0, 1, 0],
    chord: MAJOR,
    bass: 'x.......x...x...',
    arp: '0...2...1...2...',
    arpVoice: 'pluck',
    kick: '................',
    hat: '................',
    darbuka: BALADI,
    sistrum: 's.s.s.s.s.s.s.s.',
    pad: false,
    drone: true,
    scale: DOUBLE_HARMONIC,
    melody: PYRAMID_MELODY,
    melodyOctave: 3,
    mix: {
      bass: 0.45,
      arp: 0.16,
      kick: 0,
      hat: 0,
      pad: 0,
      darbuka: 0.5,
      sistrum: 0.04,
      drone: 0.3,
      melody: 0.17,
    },
  },
  // L'Oiseleur : le thème du désert pressé, rythme ayoub, pulsation lourde.
  aviaryBoss: {
    bpm: 140,
    rootHz: 82.41,
    progression: [0, 0, 1, 0],
    chord: MAJOR,
    bass: 'xx.xxx.xxx.xxx.x',
    arp: '0234320102343212',
    arpVoice: 'pluck',
    kick: 'x...x...x...x...',
    hat: '................',
    darbuka: AYOUB,
    sistrum: 's.s.s.s.s.s.s.s.',
    pad: false,
    drone: true,
    scale: DOUBLE_HARMONIC,
    melody: PYRAMID_MELODY,
    melodyOctave: 3,
    mix: {
      bass: 0.58,
      arp: 0.16,
      kick: 0.62,
      hat: 0,
      pad: 0,
      darbuka: 0.58,
      sistrum: 0.05,
      drone: 0.24,
      melody: 0.18,
    },
  },
};
