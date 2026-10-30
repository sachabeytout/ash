import { BOSSES, type BossId } from '../data/bosses';
import { ENEMIES, type EnemyId } from '../data/enemies';
import { GOD_IDS } from '../data/gods';
import { DIALOGUES, SPEAKERS, type Speaker } from '../data/story';
import { WEAPON_ORDER, type WeaponId } from '../data/weapons';
import { isUnlocked } from './forge';
import type { MetaState } from './save/schema';

/**
 * Archives de Thot : une fiche par ennemi, boss, dieu, arme et habitant de la Cage.
 * - ennemis, boss, dieux : débloqués à la première rencontre (vaincu, don accepté) ;
 * - armes : dès qu'elles sont disponibles (compteur = runs jouées avec) ;
 * - habitants : dès qu'ils t'ont parlé (compteur = dialogues entendus).
 */
export type CodexSection = 'enemy' | 'boss' | 'god' | 'weapon' | 'npc';
export const CODEX_SECTIONS: readonly CodexSection[] = ['enemy', 'boss', 'god', 'weapon', 'npc'];

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
  ...WEAPON_ORDER.map((id) => entry('weapon', id)),
  ...(Object.keys(SPEAKERS) as Speaker[]).map((id) => entry('npc', id)),
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

/** Nombre de rencontres d'une fiche (pour les habitants : dialogues entendus où ils parlent). */
export function codexCount(meta: MetaState, key: string): number {
  const [section, id] = key.split('.');
  if (section === 'npc') {
    return DIALOGUES.filter(
      (d) => meta.seenDialogues.includes(d.id) && d.lines.some((l) => l.speaker === id),
    ).length;
  }
  return meta.codex[key] ?? 0;
}

export function isDiscovered(meta: MetaState, key: string): boolean {
  const [section, id] = key.split('.');
  if (section === 'weapon') return isUnlocked(meta, id as WeaponId);
  return codexCount(meta, key) > 0;
}

export function codexProgress(meta: MetaState): { found: number; total: number } {
  return { found: CODEX.filter((e) => isDiscovered(meta, e.key)).length, total: CODEX.length };
}
