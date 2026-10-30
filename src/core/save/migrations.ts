import { WEAPONS } from '../../data/weapons';
import { GOD_IDS } from '../../data/gods';
import { getBoon } from '../../data/boons';
import { DEFAULT_SETTINGS, type Settings } from '../settings';
import { NO_PERKS, type RunState } from '../run/state';
import { SAVE_VERSION, defaultMeta, type MetaState, type SaveData } from './schema';

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
const MIGRATIONS: Record<number, (save: Raw) => Raw> = {
  // v0 : progression sans numéro de version (forme { xp, weaponParts, deaths, clears }).
  0: (old) => ({
    version: 1,
    meta: { ...old, skills: {}, totalXp: old.xp, runs: num(old.deaths) + num(old.clears) },
    run: null,
    settings: {},
    savedAt: 0,
  }),
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
  };
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
          ['common', 'rare', 'epic', 'duo', 'amp'].includes(String(b.rarity)),
      )
    : [];
  const perks = isObject(raw.perks) ? raw.perks : {};
  const pending = raw.pendingBoon;
  return {
    seed: num(raw.seed, 1) >>> 0,
    weapon: raw.weapon as RunState['weapon'],
    biome: num(raw.biome, 0, 0),
    room: num(raw.room, 1, 1),
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
    superGauge: num(raw.superGauge, 0, 0, 1),
    perks: {
      damage: num(perks.damage, NO_PERKS.damage, 0),
      healPerRoom: num(perks.healPerRoom, NO_PERKS.healPerRoom, 0),
      rareBonus: num(perks.rareBonus, NO_PERKS.rareBonus, 0),
    },
  };
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
    vibration: bool(s.vibration, d.vibration),
    aimAssist: bool(s.aimAssist, d.aimAssist),
    damageNumbers: bool(s.damageNumbers, d.damageNumbers),
    joystick: s.joystick === 'fixed' ? 'fixed' : 'floating',
    touchButtonScale: num(s.touchButtonScale, d.touchButtonScale, 0.7, 1.5),
  };
}
