import { describe, expect, it } from 'vitest';
import {
  AMON_FRENZY_MS,
  AMON_GOD_CHOICES,
  AMON_POWER_KILLS,
  amonCandidates,
  amonChallengeFor,
  amonEvent,
  amonGods,
  amonRoomCleared,
  amonStartRoom,
  applyRoyalFavor,
  newAmonWatch,
} from '../../src/core/amon';
import { specialRooms } from '../../src/core/run/special';
import { migrate } from '../../src/core/save/migrations';
import { newRun } from '../../src/core/run/state';
import { BIOMES } from '../../src/data/biomes';

const biome = BIOMES[0] as (typeof BIOMES)[number];

describe('Regard d’Amon', () => {
  it('ne regarde que des salles de combat simples, jamais avant la 2e ni juste avant le boss', () => {
    for (let seed = 1; seed < 40; seed++) {
      BIOMES.forEach((b, index) => {
        const rooms = amonCandidates(seed, index, b);
        const special = specialRooms(seed, index, b);
        for (const room of rooms) {
          expect(room).toBeGreaterThanOrEqual(2);
          expect(room).toBeLessThan(b.rooms);
          expect(b.fountainRooms).not.toContain(room);
          expect([special.event, special.trial, special.challenge]).not.toContain(room);
        }
        const start = amonStartRoom(seed, index, b);
        if (rooms.length > 0) expect(rooms).toContain(start);
      });
    }
  });

  it('commence à sa salle, revient ensuite tant que la faveur n’est pas accordée', () => {
    const seed = 1234;
    const start = amonStartRoom(seed, 0, biome) ?? 2;
    const run = { seed, biome: 0, room: start - 1, amonBiome: -1 };
    expect(amonChallengeFor(run, biome)).toBeNull();
    run.room = start;
    expect(amonChallengeFor(run, biome)).not.toBeNull();
    // Même graine, même salle : même défi (reprise de partie).
    expect(amonChallengeFor(run, biome)).toBe(amonChallengeFor({ ...run }, biome));
    const later = amonCandidates(seed, 0, biome).filter((r) => r > start);
    if (later[0]) expect(amonChallengeFor({ ...run, room: later[0] }, biome)).not.toBeNull();
    run.amonBiome = 0;
    expect(amonChallengeFor(run, biome)).toBeNull();
  });

  it('« sans être touché » : raté au premier coup reçu, réussi à la fin de la salle sinon', () => {
    const w = newAmonWatch('untouched');
    amonEvent(w, { type: 'kill', at: 0, power: true });
    expect(w.state).toBe('watching');
    expect(amonRoomCleared(w)).toBe('won');
    const hurt = newAmonWatch('untouched');
    amonEvent(hurt, { type: 'hurt' });
    expect(amonRoomCleared(hurt)).toBe('failed');
  });

  it('« frénésie » : 3 ennemis dans le délai ; trop espacés, c’est raté', () => {
    const w = newAmonWatch('frenzy');
    amonEvent(w, { type: 'kill', at: 0, power: false });
    amonEvent(w, { type: 'kill', at: AMON_FRENZY_MS, power: false });
    amonEvent(w, { type: 'kill', at: AMON_FRENZY_MS * 2, power: false });
    expect(w.state).toBe('watching');
    amonEvent(w, { type: 'kill', at: AMON_FRENZY_MS * 2 + 500, power: false });
    amonEvent(w, { type: 'kill', at: AMON_FRENZY_MS * 2 + 900, power: false });
    expect(w.state).toBe('won');
    amonEvent(w, { type: 'hurt' });
    expect(w.state).toBe('won');
    const slow = newAmonWatch('frenzy');
    amonEvent(slow, { type: 'kill', at: 0, power: false });
    expect(amonRoomCleared(slow)).toBe('failed');
  });

  it('« puissance » : seuls les ennemis vaincus à l’attaque puissante comptent', () => {
    const w = newAmonWatch('power');
    amonEvent(w, { type: 'kill', at: 0, power: false });
    expect(w.powerKills).toBe(0);
    for (let i = 0; i < AMON_POWER_KILLS; i++) amonEvent(w, { type: 'kill', at: i, power: true });
    expect(w.state).toBe('won');
  });

  it('faveur royale : 3 dieux différents, la porte de don mène au dieu choisi', () => {
    const gods = amonGods(99, 1, 4);
    expect(gods).toHaveLength(AMON_GOD_CHOICES);
    expect(new Set(gods).size).toBe(AMON_GOD_CHOICES);
    expect(applyRoyalFavor([{ kind: 'shards' }, { kind: 'boon', god: 'ra' }], 'isis')).toEqual([
      { kind: 'shards' },
      { kind: 'boon', god: 'isis' },
    ]);
    expect(applyRoyalFavor([{ kind: 'xp' }, { kind: 'shards' }], 'neith')).toEqual([
      { kind: 'boon', god: 'neith' },
      { kind: 'shards' },
    ]);
  });

  it('une partie en cours d’avant Amon reçoit son regard (migration v15 → v16)', () => {
    const run: Record<string, unknown> = { ...newRun(7, 'katana', 50, 0, 'ra') };
    delete run.amonBiome;
    const save = migrate({ version: 15, meta: {}, settings: {}, run });
    expect(save.run?.amonBiome).toBe(-1);
  });
});
