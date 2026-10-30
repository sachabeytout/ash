import { describe, expect, it } from 'vitest';
import {
  buildProfile,
  damageMultiplier,
  isEligible,
  mainValue,
  rollOffer,
  takeBoon,
  type OwnedBoon,
} from '../../src/core/boons/boons';
import {
  applyBurn,
  applyChill,
  isFrozen,
  newStatus,
  speedFactor,
  tickBurn,
} from '../../src/core/combat/status';
import { createRng } from '../../src/core/rng';
import { chooseBoon, newRun } from '../../src/core/run/state';
import { rollDoors } from '../../src/core/run/rewards';
import { BOONS, getBoon, slotOf } from '../../src/data/boons';
import { GOD_IDS } from '../../src/data/gods';
import { STATUS } from '../../src/data/status';
import { allDictionaries } from '../../src/i18n';

/** Valeur forcément présente (échoue proprement sinon). */
function must<T>(value: T | undefined | null): T {
  if (value === undefined || value === null) throw new Error('valeur manquante');
  return value;
}

const own = (...ids: string[]): OwnedBoon[] => ids.map((id) => ({ id, rarity: 'common' }));

describe('données des dons', () => {
  it('ont des identifiants uniques et des textes en français et en anglais', () => {
    const ids = BOONS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of BOONS) {
      for (const dict of Object.values(allDictionaries)) {
        expect(dict[b.nameKey], b.nameKey).toBeDefined();
        expect(dict[b.descKey], b.descKey).toBeDefined();
      }
      b.requiresAny?.forEach((id) => expect(getBoon(id)).toBeDefined());
    }
  });

  it('M1 : 12 à 15 dons de dieux, au moins un duo et une amplification', () => {
    const normal = BOONS.filter((b) => b.kind === 'normal');
    expect(normal.length).toBeGreaterThanOrEqual(12);
    expect(normal.length).toBeLessThanOrEqual(15);
    expect(BOONS.some((b) => b.kind === 'duo')).toBe(true);
    expect(BOONS.some((b) => b.kind === 'amp')).toBe(true);
    for (const god of GOD_IDS)
      expect(normal.filter((b) => b.gods.includes(god)).length).toBe(4 + (god === 'ra' ? 1 : 0));
  });
});

describe('choix des dons', () => {
  it('propose 3 dons différents du bon dieu', () => {
    for (let seed = 0; seed < 50; seed++) {
      for (const god of GOD_IDS) {
        const offer = rollOffer(createRng(seed), [], god);
        expect(offer).toHaveLength(3);
        expect(new Set(offer.map((o) => o.id)).size).toBe(3);
        offer.forEach((o) => expect(getBoon(o.id)?.gods).toContain(god));
      }
    }
  });

  it('ne propose pas un don déjà obtenu', () => {
    for (let seed = 0; seed < 50; seed++) {
      const offer = rollOffer(createRng(seed), own('ra_attack'), 'ra');
      expect(offer.map((o) => o.id)).not.toContain('ra_attack');
    }
  });

  it('le duo exige des dons des deux dieux', () => {
    const duo = must(getBoon('duo_thermal'));
    expect(isEligible(duo, own('ra_attack'), 'ra')).toBe(false);
    expect(isEligible(duo, own('ra_attack', 'skadi_dash'), 'ra')).toBe(true);
    expect(isEligible(duo, own('ra_attack', 'skadi_dash'), 'skadi')).toBe(true);
    expect(isEligible(duo, own('ra_attack', 'skadi_dash'), 'zeus')).toBe(false);
  });

  it("l'amplification exige un don de brûlure", () => {
    const amp = must(getBoon('amp_noon'));
    expect(isEligible(amp, own('ra_eye'), 'ra')).toBe(false);
    expect(isEligible(amp, own('ra_power'), 'ra')).toBe(true);
  });

  it('un nouveau don sur la même action remplace l’ancien', () => {
    const offer = rollOffer(createRng(3), own('zeus_attack'), 'ra', 5);
    const raAttack = offer.find((o) => o.id === 'ra_attack');
    expect(raAttack?.replaces).toBe('zeus_attack');
    const owned = takeBoon(own('zeus_attack', 'ra_eye'), must(raAttack));
    expect(owned.map((o) => o.id).sort()).toEqual(['ra_attack', 'ra_eye']);
  });

  it('les raretés sont toutes atteignables', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 300; seed++)
      rollOffer(createRng(seed), [], 'zeus').forEach((o) => seen.add(o.rarity));
    expect([...seen].sort()).toEqual(['common', 'epic', 'rare']);
  });

  it('chaque action n’a qu’un don dans le profil', () => {
    for (const b of BOONS)
      expect(['attack', 'power', 'dash', 'passive']).toContain(slotOf(b.effect));
  });
});

describe('profil de combat', () => {
  it('la rareté augmente la valeur principale', () => {
    const def = must(getBoon('ra_attack'));
    expect(mainValue(def.effect, 'rare')).toBeGreaterThan(mainValue(def.effect, 'common'));
    expect(mainValue(def.effect, 'epic')).toBeGreaterThan(mainValue(def.effect, 'rare'));
  });

  it('Soleil de midi allonge la brûlure de 50 %', () => {
    const base = must(buildProfile(own('ra_attack')).on.attack.burn).durationMs;
    const amped = must(buildProfile(own('ra_attack', 'amp_noon')).on.attack.burn).durationMs;
    expect(amped).toBe(Math.round(base * 1.5));
  });

  it('bonus de dégâts contre les ennemis qui brûlent ou sont givrés', () => {
    const p = buildProfile(own('ra_eye', 'skadi_heart'));
    expect(damageMultiplier(p, { burning: false, chilled: false })).toBe(1);
    expect(damageMultiplier(p, { burning: true, chilled: true })).toBeCloseTo(1.35);
  });

  it('le duo active le choc thermique', () => {
    expect(buildProfile(own('ra_attack')).thermalShock).toBeUndefined();
    expect(buildProfile(own('duo_thermal')).thermalShock?.damage).toBe(30);
  });
});

describe('états : brûlure et givre', () => {
  it('la brûlure inflige dps × durée, par paquets', () => {
    const s = newStatus();
    applyBurn(s, 0, 4, 3000);
    let total = 0;
    for (let t = 0; t <= 4000; t += 16) total += tickBurn(s, t);
    expect(total).toBe(12);
  });

  it('le givre ralentit puis gèle, et pas de gel permanent', () => {
    const s = newStatus();
    expect(applyChill(s, 0, 2)).toBe(false);
    expect(speedFactor(s, 0)).toBeCloseTo(1 - 2 * STATUS.chill.slowPerStack);
    expect(applyChill(s, 10, STATUS.chill.freezeAt)).toBe(true);
    expect(isFrozen(s, 20)).toBe(true);
    expect(speedFactor(s, 20)).toBe(0);
    const thaw = 10 + STATUS.chill.freezeMs;
    expect(isFrozen(s, thaw + 1)).toBe(false);
    // Juste après le dégel : immunité.
    expect(applyChill(s, thaw + 1, 99)).toBe(false);
    expect(applyChill(s, thaw + STATUS.chill.immuneAfterThawMs + 1, 99)).toBe(true);
  });

  it('les charges de givre s’effacent avec le temps', () => {
    const s = newStatus();
    applyChill(s, 0, 3);
    expect(speedFactor(s, STATUS.chill.durationMs + 1)).toBe(1);
  });
});

describe('run et dons', () => {
  it('la run commence par un don à choisir', () => {
    const run = newRun(1, 'katana', 50, 0, 'skadi');
    expect(run.pendingBoon).toBe('skadi');
    const [first] = rollOffer(createRng(1), run.boons, 'skadi');
    chooseBoon(run, must(first));
    expect(run.pendingBoon).toBeNull();
    expect(run.boons).toHaveLength(1);
  });

  it('Feu du foyer agrandit la vie', () => {
    const run = newRun(1, 'katana', 50, 0, 'ra');
    run.hp = 30;
    chooseBoon(run, { id: 'ra_hearth', rarity: 'common' });
    expect(run.maxHp).toBe(65);
    expect(run.hp).toBe(45);
  });

  it('une porte de don a toujours un dieu', () => {
    for (let seed = 0; seed < 100; seed++) {
      for (const d of rollDoors(createRng(seed), 2)) {
        if (d.kind === 'boon') expect(GOD_IDS).toContain(d.god);
      }
    }
  });
});
