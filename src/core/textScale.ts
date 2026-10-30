/**
 * Taille du texte (accessibilité) : les petits textes (12 px et moins) sont un peu agrandis
 * (+10 % en « Normal », +20 % en « Grand »). Les grands titres restent tels quels (ils sont déjà
 * lisibles et la mise en page en dépend).
 */
export type TextSize = 'normal' | 'large';

export const NORMAL_TEXT_SCALE = 1.1;
export const LARGE_TEXT_SCALE = 1.2;
export const SMALL_TEXT_MAX_PX = 12;

/** Taille de police ajustée : « 10px » → « 11px » en Normal, « 12px » en Grand. */
export function scaledFontSize(
  fontSize: string | number | undefined,
  size: TextSize,
): string | number | undefined {
  if (fontSize === undefined) return fontSize;
  const px =
    typeof fontSize === 'number' ? fontSize : Number(/^(\d+(?:\.\d+)?)px$/.exec(fontSize)?.[1]);
  if (!Number.isFinite(px) || px > SMALL_TEXT_MAX_PX) return fontSize;
  return `${Math.round(px * (size === 'large' ? LARGE_TEXT_SCALE : NORMAL_TEXT_SCALE))}px`;
}
