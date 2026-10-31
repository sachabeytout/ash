import { describe, expect, it } from 'vitest';
import { finishRun } from '../../src/core/meta';
import { newRun, summarize } from '../../src/core/run/state';
import {
  checksum,
  deserialize,
  exportCode,
  importCode,
  serialize,
} from '../../src/core/save/codec';
import { NewerSaveError, migrate } from '../../src/core/save/migrations';
import { SAVE_VERSION, defaultSave } from '../../src/core/save/schema';
import { SaveStore, type KeyValueStorage } from '../../src/core/save/store';

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

function sampleSave() {
  const save = defaultSave();
  save.meta.xp = 120;
  save.meta.skills = { thoth_vigor: 2 };
  save.run = newRun(42, 'twinBlades', 50, 1000, 'seth');
  save.run.room = 4;
  save.run.boons = [{ id: 'seth_attack', rarity: 'rare' }];
  save.run.superGauge = 0.5;
  return save;
}

describe('sauvegarde : format', () => {
  it('relit exactement ce qui a été écrit', () => {
    const save = sampleSave();
    expect(deserialize(serialize(save))).toEqual(save);
  });

  it('refuse une sauvegarde abîmée', () => {
    const text = serialize(sampleSave()).replace('"xp\\":120', '"xp\\":999');
    expect(() => deserialize(text)).toThrow();
  });

  it("l'empreinte change avec le contenu", () => {
    expect(checksum('a')).not.toBe(checksum('b'));
  });

  it('export / import par code texte (avec espaces et retours à la ligne)', () => {
    const save = sampleSave();
    const code = exportCode(save);
    expect(code.startsWith('ASH1-')).toBe(true);
    const wrapped = code.replace(/(.{40})/g, '$1\n ');
    expect(importCode(wrapped)).toEqual(save);
  });

  it('refuse un code inconnu', () => {
    expect(() => importCode('bonjour')).toThrow();
  });
});

describe('sauvegarde : migrations', () => {
  it('migre une ancienne progression sans version (v0)', () => {
    const save = migrate({ xp: 50, weaponParts: 3, deaths: 2, clears: 1 });
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.meta.xp).toBe(50);
    expect(save.meta.weaponParts).toBe(3);
    expect(save.meta.runs).toBe(3);
    expect(save.run).toBeNull();
  });

  it('complète les champs manquants sans perdre le reste', () => {
    const save = migrate({ version: 1, meta: { xp: 77 } });
    expect(save.meta.xp).toBe(77);
    expect(save.meta.skills).toEqual({});
    expect(save.settings.screenShake).toBe(true);
  });

  it('écarte une run abîmée et les dons inconnus', () => {
    expect(migrate({ version: 1, run: { weapon: 'bazooka' } }).run).toBeNull();
    const run = migrate({
      version: 1,
      run: { ...sampleSave().run, boons: [{ id: 'inconnu', rarity: 'rare' }] },
    }).run;
    expect(run?.boons).toEqual([]);
  });

  it("n'accepte pas une sauvegarde d'une version future", () => {
    expect(() => migrate({ version: SAVE_VERSION + 1 })).toThrow(NewerSaveError);
  });
});

describe('sauvegarde : stockage robuste', () => {
  it('sans sauvegarde : nouvelle partie', () => {
    const result = new SaveStore(memoryStorage()).load();
    expect(result.source).toBe('new');
    expect(result.save).toEqual(defaultSave());
  });

  it('garde une copie de secours et la reprend si la principale est abîmée', () => {
    const storage = memoryStorage();
    const store = new SaveStore(storage);
    const first = sampleSave();
    store.write(first, 1);
    const second = sampleSave();
    second.meta.xp = 300;
    store.write(second, 2);
    expect(store.load().save.meta.xp).toBe(300);

    storage.data.set('ash.save', '{"sum":"00","data":"tronqu'); // écriture interrompue
    const result = store.load();
    expect(result.source).toBe('backup');
    expect(result.save.meta.xp).toBe(120);
  });

  it('ne remplace pas la copie de secours par une sauvegarde abîmée', () => {
    const storage = memoryStorage();
    const store = new SaveStore(storage);
    store.write(sampleSave(), 1);
    store.write(sampleSave(), 2);
    storage.data.set('ash.save', 'abîmé');
    store.write(sampleSave(), 3);
    expect(() => deserialize(storage.data.get('ash.save.bak') ?? '')).not.toThrow();
  });

  it("une sauvegarde d'une version future passe en lecture seule", () => {
    const storage = memoryStorage();
    storage.data.set('ash.save', JSON.stringify({ version: 99 }));
    expect(new SaveStore(storage).load().readOnly).toBe(true);
  });

  it("le stockage plein n'est pas fatal", () => {
    const store = new SaveStore({
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    expect(store.write(defaultSave(), 1)).toBe(false);
  });
});

describe('fin de run', () => {
  it("crédite l'XP et les pièces, compte la mort, efface la run", () => {
    const save = sampleSave();
    const run = save.run;
    if (!run) throw new Error('run manquante');
    run.xp = 20;
    run.weaponParts = 1;
    finishRun(save, summarize(run, 'death', 'Rôdeur'));
    expect(save.meta.xp).toBe(120 + 20 + run.room * 2);
    expect(save.meta.weaponParts).toBe(1);
    expect(save.meta.deaths).toBe(1);
    expect(save.meta.runs).toBe(1);
    expect(save.run).toBeNull();
  });
});

describe('dieux égyptiens (v14 → v15)', () => {
  it('les dons d’une run en cours et les fiches des Archives suivent les nouveaux dieux', () => {
    const save = migrate({
      version: 14,
      meta: { codex: { 'god.zeus': 3, 'god.thor': 1, 'god.ra': 2, 'enemy.prowler': 5 } },
      settings: {},
      run: {
        ...newRun(7, 'katana', 50, 0, 'ra'),
        pendingBoon: 'skadi',
        boons: [
          { id: 'zeus_attack', rarity: 'rare' },
          { id: 'thor_power', rarity: 'common' },
          { id: 'zeus_dash', rarity: 'common' },
          { id: 'artemis_mark', rarity: 'common' },
          { id: 'ra_attack', rarity: 'epic' },
        ],
      },
    });
    expect(save.meta.codex['god.seth']).toBe(3);
    expect(save.meta.codex['god.sobek']).toBe(1);
    expect(save.meta.codex['god.ra']).toBe(2);
    expect(save.meta.codex['enemy.prowler']).toBe(5);
    expect(save.run?.pendingBoon).toBe('khonsou');
    expect(save.run?.boons).toEqual([
      { id: 'seth_attack', rarity: 'rare' },
      { id: 'seth_dash', rarity: 'common' },
      { id: 'ra_attack', rarity: 'epic' },
    ]);
  });
});
