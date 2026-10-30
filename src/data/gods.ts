export type GodId = 'ra' | 'zeus' | 'skadi';

export interface GodDef {
  id: GodId;
  nameKey: string;
  /** Titre court affiché sous le nom (« Soleil d'Égypte »…). */
  titleKey: string;
  /** Couleur du dieu (jamais le rouge-magenta réservé aux dangers), toujours doublée d'une icône. */
  color: number;
  /** Forme de l'icône (lisible sans les couleurs). */
  icon: 'sun' | 'bolt' | 'flake';
}

export const GODS: Record<GodId, GodDef> = {
  ra: { id: 'ra', nameKey: 'god.ra', titleKey: 'god.ra.title', color: 0xffc23a, icon: 'sun' },
  zeus: {
    id: 'zeus',
    nameKey: 'god.zeus',
    titleKey: 'god.zeus.title',
    color: 0xc9a8ff,
    icon: 'bolt',
  },
  skadi: {
    id: 'skadi',
    nameKey: 'god.skadi',
    titleKey: 'god.skadi.title',
    color: 0x8ff0ff,
    icon: 'flake',
  },
};

export const GOD_IDS = Object.keys(GODS) as GodId[];
