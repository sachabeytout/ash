import { describe, expect, it } from 'vitest';
import { allDictionaries, detectLocale, frenchSpacing, translate } from '../../src/i18n';

describe('i18n', () => {
  const fr = allDictionaries.fr;

  it('remplace les variables', () => {
    expect(translate(fr, 'fr', 'title.version', { version: '0.1.0' })).toBe('version 0.1.0');
  });

  it('gère les pluriels français (0, 1, plusieurs)', () => {
    expect(translate(fr, 'fr', 'hub.deaths', { count: 0 })).toBe("Aucune mort pour l'instant");
    expect(translate(fr, 'fr', 'hub.deaths', { count: 1 })).toBe('1 mort');
    expect(translate(fr, 'fr', 'hub.deaths', { count: 5 })).toBe('5 morts');
  });

  it('renvoie la clé si elle est inconnue', () => {
    expect(translate(fr, 'fr', 'inconnue')).toBe('inconnue');
  });

  it('a exactement les mêmes clés en français et en anglais', () => {
    expect(Object.keys(allDictionaries.en).sort()).toEqual(Object.keys(fr).sort());
  });

  it('détecte la langue, français par défaut', () => {
    expect(detectLocale(['en-US'])).toBe('en');
    expect(detectLocale(['fr-FR', 'en'])).toBe('fr');
    expect(detectLocale(['de-DE'])).toBe('fr');
  });
});

describe('typographie française', () => {
  it('un « ? » ou un « : » ne se retrouve jamais seul en début de ligne', () => {
    expect(frenchSpacing('Tu m’entends ? Oui : « vite » !')).toBe(
      'Tu m’entends\u00a0? Oui\u00a0: «\u00a0vite\u00a0»\u00a0!',
    );
    expect(translate({ q: 'Prêt ?' }, 'fr', 'q')).toBe('Prêt\u00a0?');
    expect(translate({ q: 'Ready ?' }, 'en', 'q')).toBe('Ready ?');
  });
});
