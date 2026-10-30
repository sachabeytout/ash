import { describe, expect, it } from 'vitest';
import { BARKS, BARK_COOLDOWN_MS, BARK_SHOW_MS } from '../../src/data/barks';
import fr from '../../src/i18n/fr.json';
import en from '../../src/i18n/en.json';

describe('habitants de la Cage', () => {
  it('chaque réplique existe en français et en anglais', () => {
    for (const [who, count] of Object.entries(BARKS)) {
      for (let n = 1; n <= count; n++) {
        expect(fr).toHaveProperty(`bark.${who}.${n}`);
        expect(en).toHaveProperty(`bark.${who}.${n}`);
      }
    }
  });

  it('une bulle a le temps d’être lue avant que le même habitant reparle', () => {
    expect(BARK_COOLDOWN_MS).toBeGreaterThan(BARK_SHOW_MS + 400);
  });
});
