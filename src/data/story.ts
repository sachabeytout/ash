import type { RunSummary } from '../core/run/state';

/**
 * Personnages qui parlent dans la Cage. Les identifiants sont historiques (gardés pour la sauvegarde) :
 * `aelia` = Anii (la femme d'Ash), `brokk` = Ptah (le forgeron). Les noms affichés viennent de l'i18n.
 */
export type Speaker = 'aelia' | 'thot' | 'vesper' | 'brokk' | 'oiseleur';

export interface SpeakerDef {
  nameKey: string;
  /** Couleur du portrait (jamais le rouge-magenta des dangers), doublée d'une forme. */
  color: number;
  shape: 'flame' | 'ibis' | 'raven' | 'anvil' | 'net';
}

export const SPEAKERS: Record<Speaker, SpeakerDef> = {
  aelia: { nameKey: 'speaker.aelia', color: 0xffb02e, shape: 'flame' },
  thot: { nameKey: 'speaker.thot', color: 0x7fffc0, shape: 'ibis' },
  vesper: { nameKey: 'speaker.vesper', color: 0xb8a8ff, shape: 'raven' },
  brokk: { nameKey: 'speaker.brokk', color: 0xffe08a, shape: 'anvil' },
  oiseleur: { nameKey: 'speaker.oiseleur', color: 0xd8b8ff, shape: 'net' },
};

/** Ce que la scène sait de la dernière run, pour choisir ce qui se dit. */
export type LastRun = Pick<RunSummary, 'outcome' | 'biome' | 'room' | 'killedBy'> & {
  /** La run s'est arrêtée sur un boss. */
  atBoss: boolean;
};

export interface DialogueCondition {
  /** Nombre de runs terminées (minimum / maximum). */
  minRuns?: number;
  maxRuns?: number;
  minDeaths?: number;
  /** Victoires : exactement ce nombre (étapes de l'histoire). */
  victories?: number;
  /** La dernière run s'est terminée ainsi. */
  lastOutcome?: 'death' | 'cleared';
  /** La dernière run est morte face au boss de ce biome. */
  diedToBossOf?: number;
  /** La dernière run a atteint au moins ce biome. */
  reachedBiome?: number;
}

export interface DialogueDef {
  id: string;
  condition: DialogueCondition;
  /** Le plus élevé passe en premier quand plusieurs sont possibles. */
  priority: number;
  lines: readonly { speaker: Speaker; key: string }[];
}

const line = (speaker: Speaker, key: string) => ({ speaker, key });

/**
 * Dialogues de la Cage (lore v0.3 : docs/LORE.md). Chacun n'est dit qu'une fois ; un seul par retour
 * dans la Cage. Les identifiants ne changent pas d'une version à l'autre (ils sont dans la sauvegarde) :
 * les nouveaux passages ont de nouveaux identifiants (`v3_…`) pour être entendus par tous.
 */
export const DIALOGUES: readonly DialogueDef[] = [
  // ---------- Premières rencontres ----------
  {
    id: 'intro_aelia',
    condition: { maxRuns: 0 },
    priority: 100,
    lines: [line('aelia', 'story.intro_aelia.1'), line('aelia', 'story.intro_aelia.2')],
  },
  {
    id: 'intro_vesper',
    condition: { minDeaths: 1 },
    priority: 90,
    lines: [line('vesper', 'story.intro_vesper.1'), line('vesper', 'story.intro_vesper.2')],
  },
  {
    id: 'intro_thot',
    condition: { minRuns: 2 },
    priority: 85,
    lines: [line('thot', 'story.intro_thot.1'), line('thot', 'story.intro_thot.2')],
  },
  {
    id: 'intro_brokk',
    condition: { minRuns: 3 },
    priority: 84,
    lines: [line('brokk', 'story.intro_brokk.1'), line('brokk', 'story.intro_brokk.2')],
  },
  // ---------- Lore v0.3 : la malédiction d'Anii, Ratatosk, ce que veulent les dieux ----------
  {
    id: 'v3_awaken',
    condition: { minRuns: 2 },
    priority: 65,
    lines: [line('aelia', 'story.v3_awaken.1'), line('aelia', 'story.v3_awaken.2')],
  },
  {
    id: 'v3_ratatosk',
    condition: { minRuns: 2, reachedBiome: 1 },
    priority: 50,
    lines: [line('vesper', 'story.v3_ratatosk.1'), line('thot', 'story.v3_ratatosk.2')],
  },
  {
    id: 'v3_ptah',
    condition: { minRuns: 4 },
    priority: 38,
    lines: [line('brokk', 'story.v3_ptah.1'), line('thot', 'story.v3_ptah.2')],
  },
  // ---------- Morts face aux boss ----------
  {
    id: 'boss_ammit',
    condition: { diedToBossOf: 0 },
    priority: 70,
    lines: [line('aelia', 'story.boss_ammit.1')],
  },
  {
    id: 'boss_fenrir',
    condition: { diedToBossOf: 1 },
    priority: 70,
    lines: [line('vesper', 'story.boss_fenrir.1')],
  },
  {
    id: 'boss_talos',
    condition: { diedToBossOf: 2 },
    priority: 70,
    lines: [line('brokk', 'story.boss_talos.1')],
  },
  {
    id: 'boss_oiseleur',
    condition: { diedToBossOf: 3 },
    priority: 70,
    lines: [line('aelia', 'story.boss_oiseleur.1'), line('vesper', 'story.boss_oiseleur.2')],
  },
  // ---------- Biomes atteints ----------
  {
    id: 'reach_frost',
    condition: { reachedBiome: 1 },
    priority: 60,
    lines: [line('aelia', 'story.reach_frost.1')],
  },
  {
    id: 'reach_olympus',
    condition: { reachedBiome: 2 },
    priority: 61,
    lines: [line('thot', 'story.reach_olympus.1')],
  },
  {
    id: 'reach_aviary',
    condition: { reachedBiome: 3 },
    priority: 62,
    lines: [line('vesper', 'story.reach_aviary.1')],
  },
  // ---------- Ce que la ville cache (épreuves, archives, braises, enclumes, étincelles, marques) ----------
  {
    id: 'marks_thot',
    condition: { minRuns: 3, reachedBiome: 1 },
    priority: 36,
    lines: [line('thot', 'story.marks_thot.1')],
  },
  {
    id: 'trials_vesper',
    condition: { minRuns: 4 },
    priority: 35,
    lines: [line('vesper', 'story.trials_vesper.1')],
  },
  {
    id: 'archives_thot',
    condition: { minRuns: 5 },
    priority: 34,
    lines: [line('thot', 'story.archives_thot.1')],
  },
  {
    id: 'ember_aelia',
    condition: { minRuns: 6 },
    priority: 33,
    lines: [line('aelia', 'story.ember_aelia.1'), line('aelia', 'story.ember_aelia.2')],
  },
  {
    id: 'anvil_brokk',
    condition: { minRuns: 7 },
    priority: 32,
    lines: [line('brokk', 'story.anvil_brokk.1')],
  },
  {
    id: 'spark_aelia',
    condition: { minRuns: 9 },
    priority: 31,
    lines: [line('aelia', 'story.spark_aelia.1'), line('thot', 'story.spark_aelia.2')],
  },
  // ---------- Petites histoires de la Cage (0.37.0) ----------
  {
    id: 'thot_glitch',
    condition: { minDeaths: 3 },
    priority: 28,
    lines: [line('thot', 'story.thot_glitch.1')],
  },
  {
    id: 'vesper_rumor',
    condition: { minRuns: 5, reachedBiome: 1 },
    priority: 27,
    lines: [line('vesper', 'story.vesper_rumor.1')],
  },
  {
    id: 'vesper_arena',
    condition: { minRuns: 6, reachedBiome: 1 },
    priority: 26,
    lines: [line('vesper', 'story.vesper_arena.1')],
  },
  {
    id: 'thot_variants',
    condition: { victories: 1 },
    priority: 25,
    lines: [line('thot', 'story.thot_variants.1')],
  },
  {
    id: 'brokk_gerald',
    condition: { minRuns: 8 },
    priority: 24,
    lines: [line('brokk', 'story.brokk_gerald.1'), line('thot', 'story.brokk_gerald.2')],
  },
  {
    id: 'vesper_sleep',
    condition: { minRuns: 10 },
    priority: 23,
    lines: [line('vesper', 'story.vesper_sleep.1')],
  },
  {
    id: 'aelia_memory',
    condition: { minRuns: 12 },
    priority: 22,
    lines: [line('aelia', 'story.aelia_memory.1'), line('aelia', 'story.aelia_memory.2')],
  },
  {
    id: 'brokk_marks',
    condition: { minRuns: 14 },
    priority: 21,
    lines: [line('brokk', 'story.brokk_marks.1')],
  },
  // ---------- Renaissances ----------
  {
    id: 'deaths_5',
    condition: { minDeaths: 5 },
    priority: 40,
    lines: [line('thot', 'story.deaths_5.1')],
  },
  {
    id: 'deaths_15',
    condition: { minDeaths: 15 },
    priority: 41,
    lines: [line('vesper', 'story.deaths_15.1')],
  },
  {
    id: 'deaths_30',
    condition: { minDeaths: 30 },
    priority: 42,
    lines: [line('aelia', 'story.deaths_30.1')],
  },
  // ---------- L'arc des 10 victoires ----------
  ...Array.from({ length: 9 }, (_, i): DialogueDef => {
    const n = i + 1;
    const speakers: [Speaker, Speaker][] = [
      ['aelia', 'thot'],
      ['vesper', 'vesper'],
      ['thot', 'aelia'],
      ['aelia', 'thot'],
      ['brokk', 'thot'],
      ['aelia', 'vesper'],
      ['vesper', 'aelia'],
      ['aelia', 'thot'],
      ['thot', 'vesper'],
    ];
    const [a, b] = speakers[i] ?? ['aelia', 'aelia'];
    return {
      id: `victory_${n}`,
      condition: { victories: n, lastOutcome: 'cleared' },
      priority: 200 + n,
      lines: [line(a, `story.victory_${n}.1`), line(b, `story.victory_${n}.2`)],
    };
  }),
  {
    id: 'victory_10',
    condition: { victories: 10, lastOutcome: 'cleared' },
    priority: 210,
    lines: [
      line('aelia', 'story.victory_10.1'),
      line('oiseleur', 'story.victory_10.2'),
      line('aelia', 'story.victory_10.3'),
    ],
  },
  {
    id: 'after_end',
    condition: { victories: 11 },
    priority: 150,
    lines: [line('vesper', 'story.after_end.1')],
  },
];

/** Victoires nécessaires pour la Lame de l'Aube (nommée par Ptah) et pour la vraie fin. */
export const DAWNBLADE_VICTORIES = 5;
export const TRUE_ENDING_VICTORIES = 10;
