import { describe, expect, it } from 'vitest';
import { CODEX, codexProgress, isDiscovered, recordCodex } from '../../src/core/codex';
import { migrate } from '../../src/core/save/migrations';
import { defaultMeta } from '../../src/core/save/schema';
import fr from '../../src/i18n/fr.json';
import en from '../../src/i18n/en.json';

describe('Archives de Thot', () => {
  it('chaque fiche a son texte en français et en anglais', () => {
    for (const entry of CODEX) {
      expect(fr).toHaveProperty(`codex.${entry.key}`);
      expect(en).toHaveProperty(`codex.${entry.key}`);
    }
  });

  it('16 ennemis, 4 boss et 9 dieux', () => {
    const count = (s: string) => CODEX.filter((e) => e.section === s).length;
    expect(count('enemy')).toBe(16);
    expect(count('boss')).toBe(4);
    expect(count('god')).toBe(9);
  });

  it('une rencontre débloque la fiche et compte ; les clés inconnues sont ignorées', () => {
    const meta = defaultMeta();
    expect(isDiscovered(meta, 'enemy.prowler')).toBe(false);
    recordCodex(meta, 'enemy.prowler');
    recordCodex(meta, 'enemy.prowler');
    recordCodex(meta, 'enemy.nobody');
    expect(meta.codex['enemy.prowler']).toBe(2);
    expect(meta.codex).not.toHaveProperty('enemy.nobody');
    expect(codexProgress(meta)).toEqual({ found: 1, total: CODEX.length });
  });

  it('une sauvegarde v7 passe en v8 sans perte, avec des archives vides', () => {
    const meta = { ...defaultMeta(), xp: 42 } as Record<string, unknown>;
    delete meta.codex;
    const save = migrate({ version: 7, meta, settings: {}, run: null });
    expect(save.meta.xp).toBe(42);
    expect(save.meta.codex).toEqual({});
  });

  it('les archives abîmées sont nettoyées', () => {
    const meta = {
      ...defaultMeta(),
      codex: { 'enemy.prowler': 3, 'enemy.nobody': 5, 'god.ra': -2 },
    };
    const save = migrate({ version: 8, meta, settings: {}, run: null });
    expect(save.meta.codex).toEqual({ 'enemy.prowler': 3 });
  });
});
