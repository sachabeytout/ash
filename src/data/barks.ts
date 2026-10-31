/**
 * Petites phrases des habitants de la Cage quand Ash passe près d'eux (avec un peu d'humour).
 * Les textes sont dans `src/i18n/` (`bark.<qui>.<n>`) ; `{deaths}` = nombre de renaissances.
 */
export type BarkSpeaker = 'brokk' | 'thot' | 'vesper' | 'aelia';

export const BARKS: Record<BarkSpeaker, number> = {
  brokk: 6,
  thot: 6,
  vesper: 5,
  aelia: 5,
};

/** Distance à laquelle un habitant interpelle Ash, et délai avant qu'il reparle. */
export const BARK_RANGE = 56;
export const BARK_COOLDOWN_MS = 40000;
/** Délai minimum entre deux bulles, tous habitants confondus (pas de bavardage en rafale). */
export const BARK_GLOBAL_MS = 15000;
/** Chance qu'un habitant parle quand Ash passe près de lui (sinon il se tait cette fois). */
export const BARK_CHANCE = 0.5;
export const BARK_SHOW_MS = 3800;
