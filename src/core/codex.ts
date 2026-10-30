import { BOSSES, type BossId } from '../data/bosses';
import { ENEMIES, type EnemyId } from '../data/enemies';
import { GOD_IDS } from '../data/gods';
import type { MetaState } from './save/schema';

/**
 * Archives de Thot : une fiche par ennemi, boss et dieu. Une fiche se débloque à la première
 * rencontre (ennemi ou boss vaincu, don accepté) ; le compteur sert de statistique.
 */
export type CodexSection = 'enemy' | 'boss' | 'god';
export const CODEX_SECTIONS: readonly CodexSection[] = ['enemy', 'boss', 'god'];

export interface CodexEntry {
  section: CodexSection;
  id: string;
  /** Clé de sauvegarde et préfixe des textes : `enemy.prowler`… */
  key: string;
}

export const CODEX: readonly CodexEntry[] = [
  ...(Object.keys(ENEMIES) as EnemyId[]).map((id) => entry('enemy', id)),
  ...(Object.keys(BOSSES) as BossId[]).map((id) => entry('boss', id)),
  ...GOD_IDS.map((id) => entry('god', id)),
];

function entry(section: CodexSection, id: string): CodexEntry {
  return { section, id, key: `${section}.${id}` };
}

export const CODEX_KEYS: ReadonlySet<string> = new Set(CODEX.map((e) => e.key));

/** Note une rencontre (ignore les clés inconnues). */
export function recordCodex(meta: MetaState, key: string, amount = 1): void {
  if (!CODEX_KEYS.has(key)) return;
  meta.codex[key] = (meta.codex[key] ?? 0) + amount;
}

export function isDiscovered(meta: MetaState, key: string): boolean {
  return (meta.codex[key] ?? 0) > 0;
}

export function codexProgress(meta: MetaState): { found: number; total: number } {
  return { found: CODEX.filter((e) => isDiscovered(meta, e.key)).length, total: CODEX.length };
}
