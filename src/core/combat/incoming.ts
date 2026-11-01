import { PLAYER } from '../../data/player';

/** Réduction maximale venue de la défense (compétence « Peau de cendre »). */
export const MAX_ARMOR = 0.5;

/**
 * Dégâts reçus par Ash avant boucliers et dons : dégâts de base de l'ennemi, réduits pour tous
 * (`PLAYER.damageTakenScale`), modifiés par la Balance de Maât (`heat`) et la défense (`armor`,
 * 0,05 = −5 %). Jamais moins de 1.
 */
export function incomingDamage(base: number, heat: number, armor: number): number {
  const kept = 1 - Math.min(MAX_ARMOR, Math.max(0, armor));
  return Math.max(1, Math.round(base * PLAYER.damageTakenScale * heat * kept));
}
