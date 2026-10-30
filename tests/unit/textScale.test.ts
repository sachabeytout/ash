import { describe, expect, it } from 'vitest';
import { scaledFontSize } from '../../src/core/textScale';
import { migrate } from '../../src/core/save/migrations';

describe('taille du texte', () => {
  it('les petits textes grandissent un peu (plus en Grand) ; les titres ne bougent pas', () => {
    expect(scaledFontSize('10px', 'large')).toBe('12px');
    expect(scaledFontSize('8px', 'large')).toBe('10px');
    expect(scaledFontSize('18px', 'large')).toBe('18px');
    expect(scaledFontSize('10px', 'normal')).toBe('11px');
    expect(scaledFontSize('9px', 'normal')).toBe('10px');
    expect(scaledFontSize('18px', 'normal')).toBe('18px');
    expect(scaledFontSize(undefined, 'large')).toBeUndefined();
  });

  it('les anciennes sauvegardes gardent un texte normal', () => {
    const save = migrate({ version: 13, meta: {}, settings: {}, run: null });
    expect(save.settings.textSize).toBe('normal');
  });
});
