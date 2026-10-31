/** Palette et dimensions communes. Les couleurs « danger » seront réservées aux ennemis (voir GDD). */
export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

export const COLORS = {
  background: 0x07060d,
  cageBar: 0x2a2342,
  cageGlow: 0x6b4cff,
  phoenix: 0xff7a2a,
  ember: 0xffb02e,
  text: '#ffe9d6',
  /** Texte secondaire : sable (direction artistique égyptienne, 0.55.0). */
  textDim: '#b8a888',
  /** Or, lapis-lazuli et turquoise : les couleurs de l'interface égyptienne. */
  gold: 0xffd36b,
  goldDim: 0xb8862e,
  lapis: 0x2a4a9a,
  turquoise: 0x40d0c0,
  /** Fond des fenêtres : nuit bleutée. */
  panel: 0x0b0a12,
} as const;

/**
 * Police aux allures d'inscription antique (Marcellus), chiffres plus lisibles pris dans Philosopher
 * (`AshDigits`, chargée dans main.ts). Libres : voir docs/CREDITS.md.
 */
export const FONT_FAMILY = '"AshDigits", "Marcellus", Georgia, "Times New Roman", serif';
