export type GodId =
  'ra' | 'sobek' | 'khonsou' | 'seth' | 'serket' | 'anubis' | 'bastet' | 'isis' | 'neith';
/** Tous les dieux sont égyptiens (lore v0.3) ; le type reste pour d'éventuels ajouts. */
export type Pantheon = 'egypt';

export interface GodDef {
  id: GodId;
  nameKey: string;
  /** Titre court affiché sous le nom (« Soleil d'Égypte — le feu »…). */
  titleKey: string;
  /**
   * Couleur du dieu, reprise par tout ce qui lui appartient (cartes, effets, états, flèches…).
   * Jamais le rouge-magenta réservé aux dangers, et toujours doublée d'une icône ou d'une forme.
   */
  color: number;
  /** Variante claire de la couleur, pour les textes (chiffres de dégâts) sur fond sombre. */
  text: string;
  /** Icône : la représentation du dieu + un détail de son pouvoir (lisible sans les couleurs). */
  icon:
    | 'falconSun'
    | 'crocodile'
    | 'falconMoon'
    | 'sethAnimal'
    | 'scorpionCrown'
    | 'jackal'
    | 'cat'
    | 'throne'
    | 'shield';
  pantheon: Pantheon;
}

function god(id: GodId, color: number, text: string, icon: GodDef['icon']): GodDef {
  return {
    id,
    nameKey: `god.${id}`,
    titleKey: `god.${id}.title`,
    color,
    text,
    icon,
    pantheon: 'egypt',
  };
}

/** Les 9 dieux : un pouvoir chacun (feu, eau, glace, foudre, poison, brisement, force, soin, bouclier). */
export const GODS: Record<GodId, GodDef> = {
  ra: god('ra', 0xff4a14, '#ff8a5c', 'falconSun'),
  sobek: god('sobek', 0x3f7bff, '#8cb0ff', 'crocodile'),
  khonsou: god('khonsou', 0x8ff0ff, '#c8f8ff', 'falconMoon'),
  seth: god('seth', 0xffe03a, '#fff07a', 'sethAnimal'),
  serket: god('serket', 0xc6ff3a, '#e2ff8a', 'scorpionCrown'),
  anubis: god('anubis', 0x8a4dff, '#c0a0ff', 'jackal'),
  bastet: god('bastet', 0xd89a50, '#f0c890', 'cat'),
  isis: god('isis', 0x3ddc84, '#8cf0b8', 'throne'),
  neith: god('neith', 0xc8d8ff, '#e8eeff', 'shield'),
};

export const GOD_IDS = Object.keys(GODS) as GodId[];
