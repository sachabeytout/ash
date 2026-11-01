import { MAX_ARMOR } from '../combat/incoming';
import { BIOMES } from '../../data/biomes';
import { CODEX_KEYS } from '../codex';
import { HEAT } from '../../data/heat';
import type { HeatLevels } from '../heat';
import { WEAPONS, type WeaponId } from '../../data/weapons';
import { GOD_IDS, type GodId } from '../../data/gods';
import { REWARD_KINDS, type RewardKind } from '../run/rewards';
import { BOSSES, type BossId } from '../../data/bosses';
import { TROPHIES, type TrophyId } from '../../data/trophies';
import { getBoon } from '../../data/boons';
import { DEFAULT_SETTINGS, type Settings } from '../settings';
import { NO_PERKS, type RunState } from '../run/state';
import {
  SAVE_VERSION,
  defaultMeta,
  emptyRecords,
  type MetaState,
  type Records,
  type SaveData,
} from './schema';

type Raw = Record<string, unknown>;

/** La sauvegarde vient d'une version plus récente du jeu : on ne la touche pas. */
export class NewerSaveError extends Error {
  constructor(readonly version: number) {
    super(`Sauvegarde en version ${version}, plus récente que ce jeu (${SAVE_VERSION})`);
  }
}

/**
 * Migrations : `MIGRATIONS[n]` transforme une sauvegarde de version n en version n + 1.
 * Ne jamais modifier une migration existante ; en ajouter une nouvelle à chaque changement de format.
 */
/** v14 → v15 : les 9 dieux deviennent égyptiens ; chaque ancien don devient son équivalent (null : retiré). */
const BOON_RENAMES: Record<string, string | null> = {
  ra_hearth: 'bastet_lives',
  zeus_attack: 'seth_attack',
  zeus_power: 'seth_power',
  zeus_dash: 'seth_dash',
  zeus_riposte: 'seth_riposte',
  skadi_attack: 'khonsou_attack',
  skadi_power: 'khonsou_power',
  skadi_dash: 'khonsou_dash',
  skadi_heart: 'khonsou_heart',
  anubis_attack: 'anubis_weigh',
  anubis_soul: 'isis_soul',
  athena_aegis: 'neith_aegis',
  athena_attack: 'neith_attack',
  athena_power: 'neith_power',
  athena_dash: 'neith_dash',
  artemis_attack: null,
  artemis_power: null,
  artemis_dash: null,
  artemis_mark: null,
  thor_attack: null,
  thor_power: 'seth_dash',
  thor_dash: 'sobek_dash',
  thor_wrath: null,
  hel_attack: 'serket_attack',
  hel_power: 'isis_power',
  hel_dash: 'serket_dash',
  hel_last: 'isis_last',
};
const GOD_RENAMES: Record<string, string> = {
  zeus: 'seth',
  skadi: 'khonsou',
  thor: 'sobek',
  hel: 'serket',
  athena: 'neith',
  artemis: 'isis',
};

const MIGRATIONS: Record<number, (save: Raw) => Raw> = {
  // v0 : progression sans numéro de version (forme { xp, weaponParts, deaths, clears }).
  0: (old) => ({
    version: 1,
    meta: { ...old, skills: {}, totalXp: old.xp, runs: num(old.deaths) + num(old.clears) },
    run: null,
    settings: {},
    savedAt: 0,
  }),
  // v1 → v2 : forge de Brokk et Bénédiction du Phénix (rien n'est perdu, tout part de zéro).
  1: (old) => {
    const meta = isObject(old.meta) ? old.meta : {};
    return { ...old, version: 2, meta: { ...meta, forge: {}, assistDeaths: 0 } };
  },
  // v2 → v3 : armes à débloquer chez Brokk (aucune au départ, les armes de départ restent).
  2: (old) => {
    const meta = isObject(old.meta) ? old.meta : {};
    return { ...old, version: 3, meta: { ...meta, unlocked: [] } };
  },
  // v3 → v4 : nouveaux dieux ; la run en cours garde son « Dernier souffle » de Hel (pas encore utilisé).
  3: (old) => {
    const run = isObject(old.run) ? { ...old.run, lastBreathUsed: false } : old.run;
    return { ...old, version: 4, run };
  },
  // v4 → v5 : dialogues de la Cage. Les anciens joueurs n'entendent pas l'introduction (ils ont déjà joué).
  4: (old) => {
    const meta = isObject(old.meta) ? old.meta : {};
    return { ...old, version: 5, meta: { ...meta, seenDialogues: [] } };
  },
  // v5 → v6 : Mesures d'urgence (aucune active ; la run en cours n'en a pas).
  5: (old) => {
    const meta = isObject(old.meta) ? old.meta : {};
    const run = isObject(old.run) ? { ...old.run, heat: {} } : old.run;
    return { ...old, version: 6, meta: { ...meta, heat: {} }, run };
  },
  // v6 → v7 : salles d'évènement (la run en cours n'en a encore accepté aucun).
  6: (old) => {
    const run = isObject(old.run) ? { ...old.run, eventTaken: -1 } : old.run;
    return { ...old, version: 7, run };
  },
  // v7 → v8 : Archives de Thot (vides : elles se remplissent aux prochaines rencontres).
  7: (old) => {
    const meta = isObject(old.meta) ? old.meta : {};
    return { ...old, version: 8, meta: { ...meta, codex: {} } };
  },
  // v8 → v9 : statistiques de la run en cours (comptées à partir de maintenant).
  8: (old) => {
    const run = isObject(old.run) ? { ...old.run, kills: 0, damageTaken: 0 } : old.run;
    return { ...old, version: 9, run };
  },
  // v9 → v10 : Étincelle du Phénix (aucune en attente pour la run en cours).
  9: (old) => {
    const run = isObject(old.run) ? { ...old.run, pendingSpark: false } : old.run;
    return { ...old, version: 10, run };
  },
  // v10 → v11 : nouvelles compétences de Thot (la run en cours n'en profite pas encore).
  10: (old) => {
    if (!isObject(old.run)) return { ...old, version: 11 };
    const perks = isObject(old.run.perks) ? old.run.perks : {};
    const run = {
      ...old.run,
      revivesUsed: 0,
      perks: { ...perks, startShards: 0, dashCooldown: 0, revives: 0 },
    };
    return { ...old, version: 11, run };
  },
  // v11 → v12 : Exploits (records vides : ils se remplissent à partir de maintenant).
  11: (old) => {
    const meta = isObject(old.meta) ? old.meta : {};
    return { ...old, version: 12, meta: { ...meta, records: emptyRecords() } };
  },
  // v12 → v13 : la Cage devient un lieu à parcourir ; l'arme choisie au râtelier est mémorisée.
  12: (old) => {
    const meta = isObject(old.meta) ? old.meta : {};
    return { ...old, version: 13, meta: { ...meta, selectedWeapon: 'katana' } };
  },
  // v13 → v14 : trophées (aucun encore remis : ils seront comptés sur la progression existante).
  13: (old) => {
    const meta = isObject(old.meta) ? old.meta : {};
    const records = isObject(meta.records) ? meta.records : {};
    return {
      ...old,
      version: 14,
      meta: {
        ...meta,
        trophies: [],
        records: { ...records, bestHeatClear: 0, variantsBeaten: [] },
      },
    };
  },
  // v14 → v15 : dieux égyptiens (dons de la run en cours, dieu en attente, fiches des Archives).
  14: (old) => {
    const meta = isObject(old.meta) ? old.meta : {};
    const codex: Raw = {};
    if (isObject(meta.codex)) {
      for (const [key, n] of Object.entries(meta.codex)) {
        const god = /^god\.(\w+)$/.exec(key)?.[1];
        const renamed = god && GOD_RENAMES[god] ? `god.${GOD_RENAMES[god]}` : key;
        codex[renamed] = num(codex[renamed]) + num(n);
      }
    }
    let run = old.run;
    if (isObject(run)) {
      const seen = new Set<string>();
      const boons = Array.isArray(run.boons)
        ? run.boons.flatMap((b: unknown) => {
            if (!isObject(b) || typeof b.id !== 'string') return [];
            const id = b.id in BOON_RENAMES ? BOON_RENAMES[b.id] : b.id;
            if (!id || seen.has(id)) return [];
            seen.add(id);
            return [{ ...b, id }];
          })
        : [];
      const pending = typeof run.pendingBoon === 'string' ? run.pendingBoon : null;
      run = { ...run, boons, pendingBoon: pending ? (GOD_RENAMES[pending] ?? pending) : null };
    }
    return { ...old, version: 15, meta: { ...meta, codex }, run };
  },
  // v15 → v16 : Regard d'Amon (aucune faveur encore accordée dans la run en cours).
  15: (old) => {
    const run = isObject(old.run) ? { ...old.run, amonBiome: -1 } : old.run;
    return { ...old, version: 16, run };
  },
  // v16 → v17 : la récompense d'une porte tombe en fin de salle (rien en attente pour la run en cours).
  16: (old) => {
    const run = isObject(old.run) ? { ...old.run, roomReward: null } : old.run;
    return { ...old, version: 17, run };
  },
  // v17 → v18 : Shezmu remplace Fenrir (boss du Nil de minuit) : sa fiche et sa variante battue suivent.
  17: (old) => {
    const meta = isObject(old.meta) ? old.meta : {};
    const codex = isObject(meta.codex) ? { ...meta.codex } : {};
    if (typeof codex['boss.fenrir'] === 'number') {
      codex['boss.shezmu'] = num(codex['boss.shezmu']) + codex['boss.fenrir'];
      delete codex['boss.fenrir'];
    }
    const records = isObject(meta.records) ? meta.records : {};
    const beaten = Array.isArray(records.variantsBeaten)
      ? records.variantsBeaten.map((id) => (id === 'fenrir' ? 'shezmu' : id))
      : records.variantsBeaten;
    return {
      ...old,
      version: 18,
      meta: { ...meta, codex, records: { ...records, variantsBeaten: beaten } },
    };
  },
  // v18 → v19 : la Volière devient le 3e monde, la Douât (Apophis) remplace l'Olympe (Talos) en 4e.
  // Une run en cours garde son monde ; la fiche et la variante battue de Talos passent à Apophis.
  18: (old) => {
    const meta = isObject(old.meta) ? old.meta : {};
    const codex = isObject(meta.codex) ? { ...meta.codex } : {};
    if (typeof codex['boss.talos'] === 'number') {
      codex['boss.apophis'] = num(codex['boss.apophis']) + codex['boss.talos'];
      delete codex['boss.talos'];
    }
    const records = isObject(meta.records) ? meta.records : {};
    const beaten = Array.isArray(records.variantsBeaten)
      ? records.variantsBeaten.map((id) => (id === 'talos' ? 'apophis' : id))
      : records.variantsBeaten;
    const swap = (b: unknown) => (b === 2 ? 3 : b === 3 ? 2 : b);
    const run = isObject(old.run)
      ? {
          ...old.run,
          biome: swap(old.run.biome),
          eventTaken: swap(old.run.eventTaken),
          amonBiome: swap(old.run.amonBiome),
        }
      : old.run;
    return {
      ...old,
      version: 19,
      meta: { ...meta, codex, records: { ...records, variantsBeaten: beaten } },
      run,
    };
  },
  // v19 → v20 : les amplifications deviennent des dons passifs normaux ; leur rareté « amp » devient « commun ».
  19: (old) => {
    const run = isObject(old.run)
      ? {
          ...old.run,
          boons: Array.isArray(old.run.boons)
            ? old.run.boons.map((b: unknown) =>
                isObject(b) && b.rarity === 'amp' ? { ...b, rarity: 'common' } : b,
              )
            : old.run.boons,
        }
      : old.run;
    return { ...old, version: 20, run };
  },
  // v20 → v21 : nouvelle compétence de Thot « Peau de cendre » (défense) ; une run en cours n'en a pas.
  20: (old) => {
    const run = isObject(old.run)
      ? {
          ...old.run,
          perks: { ...(isObject(old.run.perks) ? old.run.perks : {}), armor: 0 },
        }
      : old.run;
    return { ...old, version: 21, run };
  },
};

function isObject(v: unknown): v is Raw {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function num(v: unknown, fallback = 0, min = -Infinity, max = Infinity): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
}

/** Amène n'importe quelle sauvegarde connue à la version actuelle, puis la vérifie champ par champ. */
export function migrate(raw: unknown): SaveData {
  if (!isObject(raw)) throw new Error('Sauvegarde illisible');
  let save: Raw = raw;
  let version = typeof save.version === 'number' ? save.version : 0;
  if (version > SAVE_VERSION) throw new NewerSaveError(version);
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new Error(`Aucune migration depuis la version ${version}`);
    save = step(save);
    version = num(save.version, version + 1);
  }
  return sanitize(save);
}

/** Valeurs manquantes ou abîmées → valeurs par défaut (jamais de plantage, jamais de perte du reste). */
function sanitize(save: Raw): SaveData {
  return {
    version: SAVE_VERSION,
    meta: sanitizeMeta(save.meta),
    run: sanitizeRun(save.run),
    settings: sanitizeSettings(save.settings),
    savedAt: num(save.savedAt),
  };
}

function sanitizeMeta(raw: unknown): MetaState {
  const m = isObject(raw) ? raw : {};
  const base = defaultMeta();
  const skills: Record<string, number> = {};
  if (isObject(m.skills)) {
    for (const [id, level] of Object.entries(m.skills)) skills[id] = num(level, 0, 0, 99);
  }
  return {
    xp: num(m.xp, base.xp, 0),
    totalXp: num(m.totalXp, num(m.xp, 0, 0), 0),
    weaponParts: num(m.weaponParts, base.weaponParts, 0),
    runs: num(m.runs, 0, 0),
    deaths: num(m.deaths, 0, 0),
    clears: num(m.clears, 0, 0),
    skills,
    forge: sanitizeForge(m.forge),
    assistDeaths: num(m.assistDeaths, 0, 0),
    unlocked: Array.isArray(m.unlocked)
      ? [
          ...new Set(
            m.unlocked.filter((id): id is WeaponId => typeof id === 'string' && id in WEAPONS),
          ),
        ]
      : [],
    seenDialogues: Array.isArray(m.seenDialogues)
      ? [...new Set(m.seenDialogues.filter((id): id is string => typeof id === 'string'))]
      : [],
    heat: sanitizeHeat(m.heat),
    codex: sanitizeCodex(m.codex),
    records: sanitizeRecords(m.records),
    selectedWeapon:
      typeof m.selectedWeapon === 'string' && m.selectedWeapon in WEAPONS
        ? (m.selectedWeapon as WeaponId)
        : 'katana',
    trophies: Array.isArray(m.trophies)
      ? [
          ...new Set(
            m.trophies.filter(
              (id): id is TrophyId => typeof id === 'string' && TROPHIES.some((t) => t.id === id),
            ),
          ),
        ]
      : [],
  };
}

function sanitizeHeat(raw: unknown): HeatLevels {
  const levels: HeatLevels = {};
  if (!isObject(raw)) return levels;
  for (const h of HEAT) {
    if (h.id in raw) levels[h.id] = num(raw[h.id], 0, 0, h.maxLevel);
  }
  return levels;
}

function sanitizeForge(raw: unknown): MetaState['forge'] {
  const forge: MetaState['forge'] = {};
  if (!isObject(raw)) return forge;
  for (const id of Object.keys(WEAPONS) as (keyof typeof WEAPONS)[]) {
    if (id in raw) forge[id] = num(raw[id], 0, 0, 20);
  }
  return forge;
}

function sanitizeReward(raw: unknown): RunState['roomReward'] {
  if (!isObject(raw) || !(REWARD_KINDS as readonly unknown[]).includes(raw.kind)) return null;
  const kind = raw.kind as RewardKind;
  const god = (GOD_IDS as readonly unknown[]).includes(raw.god) ? (raw.god as GodId) : undefined;
  if (kind === 'boon') return { kind, god: god ?? 'ra' };
  return { kind };
}

function sanitizeRun(raw: unknown): RunState | null {
  if (!isObject(raw)) return null;
  if (typeof raw.weapon !== 'string' || !(raw.weapon in WEAPONS)) return null;
  const maxHp = num(raw.maxHp, 50, 1);
  const boons = Array.isArray(raw.boons)
    ? raw.boons.filter(
        (b): b is { id: string; rarity: RunState['boons'][number]['rarity'] } =>
          isObject(b) &&
          typeof b.id === 'string' &&
          getBoon(b.id) !== undefined &&
          ['common', 'rare', 'epic', 'duo'].includes(String(b.rarity)),
      )
    : [];
  const perks = isObject(raw.perks) ? raw.perks : {};
  const pending = raw.pendingBoon;
  return {
    seed: num(raw.seed, 1) >>> 0,
    weapon: raw.weapon as RunState['weapon'],
    biome: num(raw.biome, 0, 0, BIOMES.length - 1),
    room: num(raw.room, 1, 0), // 0 = marchand
    hp: num(raw.hp, maxHp, 1, maxHp),
    maxHp,
    damageBonus: num(raw.damageBonus, 0, 0),
    shards: num(raw.shards, 0, 0),
    xp: num(raw.xp, 0, 0),
    weaponParts: num(raw.weaponParts, 0, 0),
    startedAt: num(raw.startedAt),
    elapsedMs: num(raw.elapsedMs, 0, 0),
    boons: boons.map((b) => ({ id: b.id, rarity: b.rarity })),
    pendingBoon:
      typeof pending === 'string' && (GOD_IDS as string[]).includes(pending)
        ? (pending as RunState['pendingBoon'])
        : null,
    pendingSpark: raw.pendingSpark === true,
    superGauge: num(raw.superGauge, 0, 0, 1),
    weaponLevel: num(raw.weaponLevel, 0, 0, 20),
    lastBreathUsed: raw.lastBreathUsed === true,
    revivesUsed: Math.floor(num(raw.revivesUsed, 0, 0, 9)),
    amonBiome: Math.round(num(raw.amonBiome, -1, -1, BIOMES.length - 1)),
    roomReward: sanitizeReward(raw.roomReward),
    heat: sanitizeHeat(raw.heat),
    eventTaken: Math.round(num(raw.eventTaken, -1, -1, BIOMES.length - 1)),
    kills: Math.floor(num(raw.kills, 0, 0)),
    damageTaken: Math.floor(num(raw.damageTaken, 0, 0)),
    perks: {
      damage: num(perks.damage, NO_PERKS.damage, 0),
      healPerRoom: num(perks.healPerRoom, NO_PERKS.healPerRoom, 0),
      rareBonus: num(perks.rareBonus, NO_PERKS.rareBonus, 0),
      startShards: num(perks.startShards, NO_PERKS.startShards, 0),
      dashCooldown: num(perks.dashCooldown, NO_PERKS.dashCooldown, 0, 0.5),
      revives: Math.floor(num(perks.revives, NO_PERKS.revives, 0, 3)),
      armor: num(perks.armor, NO_PERKS.armor, 0, MAX_ARMOR),
    },
  };
}

function sanitizeRecords(raw: unknown): Records {
  const r = isObject(raw) ? raw : {};
  const byWeapon: Records['clearsByWeapon'] = {};
  if (isObject(r.clearsByWeapon)) {
    for (const [id, n] of Object.entries(r.clearsByWeapon)) {
      if (id in WEAPONS) byWeapon[id as WeaponId] = Math.floor(num(n, 0, 0));
    }
  }
  return {
    bestRooms: Math.floor(num(r.bestRooms, 0, 0)),
    fastestClearMs: Math.floor(num(r.fastestClearMs, 0, 0)),
    totalKills: Math.floor(num(r.totalKills, 0, 0)),
    clearsByWeapon: byWeapon,
    bestHeatClear: Math.floor(num(r.bestHeatClear, 0, 0, 99)),
    variantsBeaten: Array.isArray(r.variantsBeaten)
      ? [
          ...new Set(
            r.variantsBeaten.filter((id): id is BossId => typeof id === 'string' && id in BOSSES),
          ),
        ]
      : [],
  };
}

function sanitizeCodex(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isObject(raw)) return out;
  for (const [key, value] of Object.entries(raw)) {
    const n = Math.floor(num(value, 0, 0));
    if (CODEX_KEYS.has(key) && n > 0) out[key] = n;
  }
  return out;
}

function sanitizeSettings(raw: unknown): Settings {
  const s = isObject(raw) ? raw : {};
  const d = DEFAULT_SETTINGS;
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
  return {
    masterVolume: num(s.masterVolume, d.masterVolume, 0, 1),
    sfxVolume: num(s.sfxVolume, d.sfxVolume, 0, 1),
    musicVolume: num(s.musicVolume, d.musicVolume, 0, 1),
    screenShake: bool(s.screenShake, d.screenShake),
    // Ajouté en 0.22.0 : désactivé par défaut.
    reduceFlashes: bool(s.reduceFlashes, d.reduceFlashes),
    vibration: bool(s.vibration, d.vibration),
    aimAssist: bool(s.aimAssist, d.aimAssist),
    damageNumbers: bool(s.damageNumbers, d.damageNumbers),
    joystick: s.joystick === 'fixed' ? 'fixed' : 'floating',
    touchButtonScale: num(s.touchButtonScale, d.touchButtonScale, 0.7, 1.5),
    // Ajoutés en 0.4.0 : absents des anciennes sauvegardes → valeurs par défaut (pas de perte).
    quality: s.quality === 'low' || s.quality === 'medium' ? s.quality : 'high',
    // Ajouté en 0.16.0 : activé par défaut (ne fait que baisser la qualité si le jeu rame).
    autoQuality: bool(s.autoQuality, d.autoQuality),
    // Ajouté en 0.39.0 : texte normal par défaut.
    textSize: s.textSize === 'large' ? 'large' : 'normal',
    language: s.language === 'fr' || s.language === 'en' ? s.language : 'auto',
    assist: bool(s.assist, d.assist),
  };
}
