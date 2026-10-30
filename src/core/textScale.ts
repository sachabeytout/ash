/**
 * Taille du texte (accessibilité) : en « Grand », les petits textes (12 px et moins) sont agrandis.
 * Les grands titres restent tels quels (ils sont déjà lisibles et la mise en page en dépend).
 */
export type TextSize = 'normal' | 'large';

export const LARGE_TEXT_SCALE = 1.2;
export const SMALL_TEXT_MAX_PX = 12;

/** Taille de police ajustée : « 10px » → « 12px » en Grand ; inchangée sinon. */
export function scaledFontSize(
  fontSize: string | number | undefined,
  size: TextSize,
): string | number | undefined {
  if (size === 'normal' || fontSize === undefined) return fontSize;
  const px =
    typeof fontSize === 'number' ? fontSize : Number(/^(\d+(?:\.\d+)?)px$/.exec(fontSize)?.[1]);
  if (!Number.isFinite(px) || px > SMALL_TEXT_MAX_PX) return fontSize;
  return `${Math.round(px * LARGE_TEXT_SCALE)}px`;
}
