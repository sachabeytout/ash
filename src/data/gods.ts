export type GodId =
  'ra' | 'zeus' | 'skadi' | 'anubis' | 'bastet' | 'athena' | 'artemis' | 'thor' | 'hel';
export type Pantheon = 'egypt' | 'greece' | 'norse';

export interface GodDef {
  id: GodId;
  nameKey: string;
  /** Titre court affiché sous le nom (« Soleil d'Égypte »…). */
  titleKey: string;
  /**
   * Couleur du dieu, reprise par tout ce qui lui appartient (cartes, effets, états, flèches…).
   * Jamais le rouge-magenta réservé aux dangers, et toujours doublée d'une icône ou d'une forme.
   */
  color: number;
  /** Variante claire de la couleur, pour les textes (chiffres de dégâts) sur fond sombre. */
  text: string;
  /** Forme de l'icône (lisible sans les couleurs). */
  icon: 'sun' | 'bolt' | 'flake' | 'jackal' | 'cat' | 'shield' | 'moon' | 'hammer' | 'veil';
  pantheon: Pantheon;
}

export const GODS: Record<GodId, GodDef> = {
  ra: {
    id: 'ra',
    nameKey: 'god.ra',
    titleKey: 'god.ra.title',
    color: 0xff4a14,
    text: '#ff8a5c',
    icon: 'sun',
    pantheon: 'egypt',
  },
  zeus: {
    id: 'zeus',
    nameKey: 'god.zeus',
    titleKey: 'god.zeus.title',
    color: 0xffe03a,
    text: '#fff07a',
    icon: 'bolt',
    pantheon: 'greece',
  },
  skadi: {
    id: 'skadi',
    nameKey: 'god.skadi',
    titleKey: 'god.skadi.title',
    color: 0x8ff0ff,
    text: '#c8f8ff',
    icon: 'flake',
    pantheon: 'norse',
  },
  anubis: {
    id: 'anubis',
    nameKey: 'god.anubis',
    titleKey: 'god.anubis.title',
    color: 0x3ddc84,
    text: '#8cf0b8',
    icon: 'jackal',
    pantheon: 'egypt',
  },
  bastet: {
    id: 'bastet',
    nameKey: 'god.bastet',
    titleKey: 'god.bastet.title',
    color: 0xc6ff3a,
    text: '#e2ff8a',
    icon: 'cat',
    pantheon: 'egypt',
  },
  athena: {
    id: 'athena',
    nameKey: 'god.athena',
    titleKey: 'god.athena.title',
    color: 0xd89a50,
    text: '#f0c890',
    icon: 'shield',
    pantheon: 'greece',
  },
  artemis: {
    id: 'artemis',
    nameKey: 'god.artemis',
    titleKey: 'god.artemis.title',
    color: 0xc8d8ff,
    text: '#e8eeff',
    icon: 'moon',
    pantheon: 'greece',
  },
  thor: {
    id: 'thor',
    nameKey: 'god.thor',
    titleKey: 'god.thor.title',
    color: 0x3f7bff,
    text: '#8cb0ff',
    icon: 'hammer',
    pantheon: 'norse',
  },
  hel: {
    id: 'hel',
    nameKey: 'god.hel',
    titleKey: 'god.hel.title',
    color: 0x8a4dff,
    text: '#c0a0ff',
    icon: 'veil',
    pantheon: 'norse',
  },
};

export const GOD_IDS = Object.keys(GODS) as GodId[];
