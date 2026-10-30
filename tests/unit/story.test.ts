import { describe, expect, it } from 'vitest';
import { markSeen, nextDialogue } from '../../src/core/story';
import { defaultMeta } from '../../src/core/save/schema';
import { DIALOGUES, SPEAKERS, type LastRun } from '../../src/data/story';
import { allDictionaries } from '../../src/i18n';

const death = (biome: number, atBoss = false): LastRun => ({
  outcome: 'death',
  biome,
  room: atBoss ? 11 : 3,
  atBoss,
});
const victory: LastRun = { outcome: 'cleared', biome: 3, room: 8, atBoss: true };

describe('histoire', () => {
  it('chaque réplique et chaque personnage ont leur texte', () => {
    expect(new Set(DIALOGUES.map((d) => d.id)).size).toBe(DIALOGUES.length);
    for (const d of DIALOGUES) {
      for (const l of d.lines) {
        for (const dict of Object.values(allDictionaries)) {
          expect(dict[l.key], l.key).toBeDefined();
          expect(dict[SPEAKERS[l.speaker].nameKey]).toBeDefined();
        }
      }
    }
  });

  it('première visite : Aelia ; puis chaque dialogue n’est dit qu’une fois', () => {
    const meta = defaultMeta();
    expect(nextDialogue(meta, undefined)?.id).toBe('intro_aelia');
    markSeen(meta, 'intro_aelia');
    expect(nextDialogue(meta, undefined)).toBeUndefined();
  });

  it('une mort face à Ammit fait parler Aelia d’Ammit', () => {
    const meta = defaultMeta();
    meta.runs = 1;
    meta.deaths = 1;
    meta.seenDialogues = ['intro_aelia', 'intro_vesper'];
    expect(nextDialogue(meta, death(0, true))?.id).toBe('boss_ammit');
    expect(nextDialogue(meta, death(0, false))).toBeUndefined();
  });

  it('les étapes de victoire passent avant le reste, dans l’ordre', () => {
    const meta = defaultMeta();
    meta.runs = 6;
    meta.clears = 2;
    meta.seenDialogues = ['intro_aelia'];
    expect(nextDialogue(meta, victory)?.id).toBe('victory_1');
    markSeen(meta, 'victory_1');
    expect(nextDialogue(meta, victory)?.id).toBe('victory_2');
  });

  it('les 10 étapes de l’arc existent', () => {
    for (let n = 1; n <= 10; n++) expect(DIALOGUES.some((d) => d.id === `victory_${n}`)).toBe(true);
  });
});

describe('répliques des dieux (0.37.0)', () => {
  it('chaque dieu a ses 4 répliques en français et en anglais', async () => {
    const { GOD_IDS, GODS } = await import('../../src/data/gods');
    const fr = (await import('../../src/i18n/fr.json')).default as unknown as Record<
      string,
      string
    >;
    const en = (await import('../../src/i18n/en.json')).default as unknown as Record<
      string,
      string
    >;
    for (const id of GOD_IDS) {
      for (let n = 1; n <= 4; n++) {
        expect(fr[`${GODS[id].nameKey}.quote.${n}`]).toBeTruthy();
        expect(en[`${GODS[id].nameKey}.quote.${n}`]).toBeTruthy();
      }
    }
  });
});
