import { describe, expect, it } from 'vitest';
import {
  buildProfile,
  damageMultiplier,
  isEligible,
  mainValue,
  rollOffer,
  rollUpgrades,
  slotGod,
  takeBoon,
  upgradableBoons,
  type OwnedBoon,
} from '../../src/core/boons/boons';
import { rollDoorRewards } from '../../src/core/run/rewards';
import {
  tickVenom,
  lightningFactor,
  isSoaked,
  isPoisoned,
  applyVenom,
  applySoak,
  applyBurn,
  applyChill,
  applyCurse,
  applyJudge,
  applyStun,
  applyWeaken,
  isCursed,
  isFrozen,
  isStunned,
  judgedBonus,
  newStatus,
  speedFactor,
  tickBurn,
  weakenFactor,
} from '../../src/core/combat/status';
import { createRng } from '../../src/core/rng';
import { chooseBoon, newRun, upgradeBoon } from '../../src/core/run/state';
import { rollDoors, rollGod } from '../../src/core/run/rewards';
import { BOONS, getBoon, slotOf } from '../../src/data/boons';
import { GOD_IDS, GODS } from '../../src/data/gods';
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

  it('chaque dieu a un don par action (attaque, puissante, dash, Super) ; il existe des duos et des passifs', () => {
    const normal = BOONS.filter((b) => b.kind === 'normal');
    for (const god of GOD_IDS) {
      expect(normal.filter((b) => b.gods.includes(god)).length, god).toBeGreaterThanOrEqual(4);
    }
    expect(BOONS.filter((b) => b.kind === 'duo').length).toBeGreaterThanOrEqual(4);
    for (const god of GOD_IDS) {
      for (const slot of ['attack', 'power', 'dash', 'super'] as const) {
        expect(
          BOONS.some(
            (b) => b.kind === 'normal' && b.gods.includes(god) && slotOf(b.effect) === slot,
          ),
          `${god} ${slot}`,
        ).toBe(true);
      }
      expect(
        BOONS.some((b) => b.gods.includes(god) && slotOf(b.effect) === 'passive'),
        `${god} passif`,
      ).toBe(true);
    }
  });

  it('chaque action a au plus un don par dieu (sinon le choix serait confus)', () => {
    for (const god of GOD_IDS) {
      for (const slot of ['attack', 'power', 'dash', 'super'] as const) {
        const n = BOONS.filter(
          (b) => b.kind === 'normal' && b.gods.includes(god) && slotOf(b.effect) === slot,
        ).length;
        expect(n, `${god} ${slot}`).toBeLessThanOrEqual(1);
      }
    }
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
    expect(isEligible(duo, own('ra_attack', 'khonsou_dash'), 'ra')).toBe(true);
    expect(isEligible(duo, own('ra_attack', 'khonsou_dash'), 'khonsou')).toBe(true);
    expect(isEligible(duo, own('ra_attack', 'khonsou_dash'), 'seth')).toBe(false);
  });

  it("l'amplification exige un don de brûlure", () => {
    const amp = must(getBoon('amp_noon'));
    expect(isEligible(amp, own('ra_eye'), 'ra')).toBe(false);
    expect(isEligible(amp, own('ra_power'), 'ra')).toBe(true);
  });

  it('un nouveau don sur la même action remplace l’ancien', () => {
    const offer = rollOffer(createRng(3), own('seth_attack'), 'ra', 5);
    const raAttack = offer.find((o) => o.id === 'ra_attack');
    expect(raAttack?.replaces).toBe('seth_attack');
    const owned = takeBoon(own('seth_attack', 'ra_eye'), must(raAttack));
    expect(owned.map((o) => o.id).sort()).toEqual(['ra_attack', 'ra_eye']);
  });

  it('les raretés sont toutes atteignables', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 300; seed++)
      rollOffer(createRng(seed), [], 'seth').forEach((o) => seen.add(o.rarity));
    expect([...seen].sort()).toEqual(['common', 'epic', 'rare']);
  });

  it('chaque action n’a qu’un don dans le profil', () => {
    for (const b of BOONS)
      expect(['attack', 'power', 'dash', 'super', 'passive']).toContain(slotOf(b.effect));
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
    const p = buildProfile(own('ra_eye', 'khonsou_heart'));
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
    const run = newRun(1, 'katana', 50, 0, 'khonsou');
    expect(run.pendingBoon).toBe('khonsou');
    const [first] = rollOffer(createRng(1), run.boons, 'khonsou');
    chooseBoon(run, must(first));
    expect(run.pendingBoon).toBeNull();
    expect(run.boons).toHaveLength(1);
  });

  it('Neuf vies (Bastet) agrandit la vie', () => {
    const run = newRun(1, 'katana', 50, 0, 'bastet');
    run.hp = 30;
    chooseBoon(run, { id: 'bastet_lives', rarity: 'common' });
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

describe('nouveaux dieux : profil et états', () => {
  it('Anubis : seuils d’exécution ; Bastet : critiques et vitesse', () => {
    const p = buildProfile(own('anubis_weigh', 'anubis_power', 'bastet_swift', 'bastet_dash'));
    // Pesée des âmes (passif, 8 %) s'ajoute à l'attaque ; la puissante garde le plus haut (20 %).
    expect(p.on.attack.execute).toBeCloseTo(0.08);
    expect(p.on.power.execute).toBeCloseTo(0.2);
    expect(p.speed).toBeCloseTo(0.08);
    expect(p.on.dash.dashCooldown).toBeCloseTo(0.25);
  });

  it('Neith : égide + amplification ; Seth : l’amplification allonge l’étourdissement', () => {
    const p = buildProfile(own('neith_aegis', 'amp_aegis', 'seth_dash', 'amp_thunder'));
    expect(p.aegis).toBe(2);
    expect(p.on.dash.stun?.chance).toBe(1);
    expect(p.on.dash.stun?.durationMs).toBe(Math.round(600 * 1.5));
  });

  it('les bonus de dégâts se cumulent selon l’état de la cible', () => {
    const p = buildProfile(own('sobek_flood', 'serket_toxin'));
    expect(
      damageMultiplier(p, {
        burning: false,
        chilled: false,
        soaked: true,
        poisoned: true,
        judged: 0.25,
      }),
    ).toBeCloseTo(1.65);
  });

  it('étourdi, jugé, affaibli, maudit', () => {
    const s = newStatus();
    applyStun(s, 0, 500);
    expect(isStunned(s, 400)).toBe(true);
    expect(isStunned(s, 600)).toBe(false);
    applyJudge(s, 0, 0.25, 1000);
    applyJudge(s, 100, 0.1, 1000);
    expect(judgedBonus(s, 500)).toBeCloseTo(0.25);
    expect(judgedBonus(s, 1200)).toBe(0);
    applyWeaken(s, 0, 0.2, 1000);
    expect(weakenFactor(s, 500)).toBeCloseTo(0.8);
    expect(weakenFactor(s, 1500)).toBe(1);
    applyCurse(s, 0, 12, 36);
    expect(isCursed(s, 100)).toBe(true);
  });

  it('tous les dieux sont égyptiens et peuvent être tirés', () => {
    const rng = createRng(11);
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) seen.add(rollGod(rng));
    expect(seen.size).toBe(GOD_IDS.length);
    for (const id of GOD_IDS) expect(GODS[id].pantheon).toBe('egypt');
  });
});

describe('Étincelle du Phénix', () => {
  it('propose des dons possédés au cran suivant, jamais les épiques, duos ou amplifications', () => {
    const owned = [
      { id: 'ra_attack', rarity: 'common' as const },
      { id: 'ra_power', rarity: 'rare' as const },
      { id: 'zeus_attack', rarity: 'epic' as const },
    ];
    const offers = rollUpgrades(createRng(4), owned, 3);
    expect(offers).toHaveLength(2);
    for (const o of offers) {
      const before = owned.find((b) => b.id === o.id);
      expect(o.from).toBe(before?.rarity);
      expect(o.rarity).toBe(before?.rarity === 'common' ? 'rare' : 'epic');
    }
    expect(upgradableBoons([{ id: 'zeus_attack', rarity: 'epic' }])).toHaveLength(0);
  });

  it('améliorer un don change sa rareté sur place et retire l’Étincelle en attente', () => {
    const run = newRun(1, 'katana', 50, 0, 'ra');
    run.boons = [{ id: 'ra_attack', rarity: 'common' }];
    run.pendingSpark = true;
    upgradeBoon(run, { id: 'ra_attack', rarity: 'rare', from: 'common' });
    expect(run.boons).toEqual([{ id: 'ra_attack', rarity: 'rare' }]);
    expect(run.pendingSpark).toBe(false);
    // Une offre périmée (rareté déjà changée) ne fait rien.
    upgradeBoon(run, { id: 'ra_attack', rarity: 'rare', from: 'common' });
    expect(run.boons[0]?.rarity).toBe('rare');
  });

  it('la porte Étincelle peut être exclue quand rien n’est améliorable', () => {
    for (let seed = 0; seed < 30; seed++) {
      expect(rollDoorRewards(createRng(seed), 2, ['spark'])).not.toContain('spark');
    }
  });
});

describe('nouveaux duos (0.24.0)', () => {
  it('chaque duo n’est proposé qu’avec un don de chacun de ses deux dieux', () => {
    const duos: [string, OwnedBoon[], 'ra' | 'neith' | 'seth'][] = [
      [
        'duo_aegis_storm',
        [
          { id: 'neith_aegis', rarity: 'common' },
          { id: 'seth_attack', rarity: 'common' },
        ],
        'neith',
      ],
      [
        'duo_black_sun',
        [
          { id: 'ra_attack', rarity: 'common' },
          { id: 'serket_attack', rarity: 'common' },
        ],
        'ra',
      ],
      [
        'duo_embalm',
        [
          { id: 'ra_attack', rarity: 'common' },
          { id: 'isis_soul', rarity: 'common' },
        ],
        'ra',
      ],
      [
        'duo_storm',
        [
          { id: 'seth_attack', rarity: 'common' },
          { id: 'sobek_attack', rarity: 'common' },
        ],
        'seth',
      ],
    ];
    for (const [id, owned, god] of duos) {
      const def = getBoon(id);
      if (!def) throw new Error(id);
      expect(isEligible(def, owned, god)).toBe(true);
      expect(isEligible(def, owned.slice(0, 1), god)).toBe(false);
    }
  });

  it('les duos remplissent le profil de combat', () => {
    const p = buildProfile([
      { id: 'duo_aegis_storm', rarity: 'duo' },
      { id: 'duo_black_sun', rarity: 'duo' },
      { id: 'duo_thunder_claws', rarity: 'duo' },
      { id: 'duo_embalm', rarity: 'duo' },
    ]);
    expect(p.aegisStorm).toBeGreaterThan(0);
    expect(p.blackSun?.dps).toBeGreaterThan(0);
    expect(p.critStun).toBe(450);
    expect(p.embalm).toBeGreaterThan(0);
  });
});

describe('nouvelles amplifications (0.25.0)', () => {
  it('chaque amplification renforce le don de son dieu', () => {
    const base = buildProfile([
      { id: 'seth_attack', rarity: 'common' },
      { id: 'khonsou_power', rarity: 'common' },
      { id: 'anubis_weigh', rarity: 'common' },
      { id: 'serket_power', rarity: 'common' },
      { id: 'serket_dash', rarity: 'common' },
    ]);
    const amped = buildProfile([
      { id: 'seth_attack', rarity: 'common' },
      { id: 'khonsou_power', rarity: 'common' },
      { id: 'anubis_weigh', rarity: 'common' },
      { id: 'serket_power', rarity: 'common' },
      { id: 'serket_dash', rarity: 'common' },
      { id: 'amp_arc', rarity: 'common' },
      { id: 'amp_winter', rarity: 'common' },
      { id: 'amp_scales', rarity: 'common' },
      { id: 'amp_plague', rarity: 'common' },
    ]);
    expect(amped.on.attack.chain?.bounces).toBe((base.on.attack.chain?.bounces ?? 0) + 2);
    expect(amped.on.power.chill).toBe((base.on.power.chill ?? 0) + 1);
    expect(amped.on.attack.execute).toBeCloseTo((base.on.attack.execute ?? 0) + 0.05);
    expect(amped.on.power.venom?.dps).toBeGreaterThan(base.on.power.venom?.dps ?? 0);
  });

  it('les anciens renforts grandissent avec la rareté (ce sont des dons passifs normaux)', () => {
    const arc = (rarity: 'common' | 'epic') =>
      buildProfile([
        { id: 'seth_attack', rarity: 'common' },
        { id: 'amp_arc', rarity },
      ]).on.attack.chain?.bounces ?? 0;
    expect(arc('epic')).toBeGreaterThan(arc('common'));
  });

  it('un don de Super agit sur les coups du Super', () => {
    const p = buildProfile([{ id: 'ra_super', rarity: 'common' }]);
    expect(p.on.super.burn?.dps).toBeGreaterThan(0);
    expect(p.on.attack.burn).toBeUndefined();
  });
});

describe('noms des dons', () => {
  it('deux dons n’ont jamais le même nom (français et anglais)', async () => {
    for (const lang of ['fr', 'en'] as const) {
      const dict = (await import(`../../src/i18n/${lang}.json`)).default as Record<string, string>;
      const names = BOONS.map((b) => dict[b.nameKey]);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});

describe('couleurs des dieux', () => {
  const DANGER = 0xff2a6d;
  const rgb = (c: number) => ({ r: (c >> 16) & 0xff, g: (c >> 8) & 0xff, b: c & 0xff });
  const hue = ({ r, g, b }: { r: number; g: number; b: number }): number => {
    const max = Math.max(r, g, b);
    const d = max - Math.min(r, g, b);
    if (d === 0) return 0;
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };

  it('chaque dieu a sa propre couleur, d’une teinte bien distincte du rouge-magenta des dangers', () => {
    const colors = GOD_IDS.map((id) => GODS[id].color);
    expect(new Set(colors).size).toBe(GOD_IDS.length);
    const danger = hue(rgb(DANGER));
    for (const c of colors) {
      const h = hue(rgb(c));
      const gap = Math.min(Math.abs(h - danger), 360 - Math.abs(h - danger));
      expect(gap).toBeGreaterThanOrEqual(25);
    }
  });

  it('la couleur de texte de chaque dieu est claire (lisible sur fond sombre)', () => {
    for (const id of GOD_IDS) {
      const c = parseInt(GODS[id].text.slice(1), 16);
      const { r, g, b } = rgb(c);
      expect(0.2126 * r + 0.7152 * g + 0.0722 * b).toBeGreaterThan(140);
    }
  });

  it("le dieu de l'attaque est celui du don posé sur l'attaque", () => {
    const attack = BOONS.find((b) => slotOf(b.effect) === 'attack' && b.gods.length === 1);
    const dash = BOONS.find((b) => slotOf(b.effect) === 'dash' && b.gods[0] !== attack?.gods[0]);
    if (!attack || !dash) throw new Error('dons manquants');
    expect(slotGod([], 'attack')).toBeUndefined();
    const owned = [
      { id: dash.id, rarity: 'common' as const },
      { id: attack.id, rarity: 'common' as const },
    ];
    expect(slotGod(owned, 'attack')).toBe(attack.gods[0]);
    expect(slotGod(owned, 'dash')).toBe(dash.gods[0]);
  });
});

describe('eau de Sobek et venin de Serket', () => {
  it('un ennemi trempé est ralenti, conduit la foudre et gèle deux fois plus vite', () => {
    const s = newStatus();
    applySoak(s, 0, 0.2, 3000);
    expect(isSoaked(s, 1000)).toBe(true);
    expect(speedFactor(s, 1000)).toBeCloseTo(0.8);
    expect(lightningFactor(s, 1000)).toBe(STATUS.soak.lightningMultiplier);
    applyChill(s, 1000, 1);
    expect(s.chill).toBe(STATUS.soak.chillMultiplier);
    expect(isSoaked(s, 3500)).toBe(false);
    expect(lightningFactor(s, 3500)).toBe(1);
  });

  it('le venin s’accumule (plafonné) et fait des dégâts dans le temps', () => {
    const s = newStatus();
    applyVenom(s, 0, 3, 2);
    applyVenom(s, 100, 3, 2);
    expect(s.venomStacks).toBe(6);
    applyVenom(s, 200, 10, 2);
    expect(s.venomStacks).toBe(STATUS.venom.maxStacks);
    let total = 0;
    for (let t = 0; t <= 1200; t += 100) total += tickVenom(s, t);
    // 8 doses × 2 dégâts/s pendant ~1 s.
    expect(total).toBeGreaterThanOrEqual(14);
    expect(total).toBeLessThanOrEqual(18);
    expect(isPoisoned(s, 1200)).toBe(true);
    tickVenom(s, 200 + STATUS.venom.durationMs + 1);
    expect(isPoisoned(s, 200 + STATUS.venom.durationMs + 1)).toBe(false);
  });

  it('les dons d’eau, de venin et de soin remplissent le profil', () => {
    const p = buildProfile(
      own('sobek_attack', 'serket_power', 'amp_plague', 'isis_dew', 'duo_storm'),
    );
    expect(p.on.attack.soak?.slow).toBeCloseTo(0.2);
    expect(p.on.power.venom?.stacks).toBe(3);
    expect(p.on.power.venom?.dps).toBeCloseTo(3);
    expect(p.roomHeal).toBe(4);
    expect(p.conduct).toBe(10);
  });
});

describe('passifs « en plus » (0.58.0)', () => {
  it('un passif d’action s’ajoute au don qui occupe la case, sans le remplacer', () => {
    const p = buildProfile(own('seth_dash', 'ra_trail'));
    expect(p.on.dash.stun).toBeDefined();
    expect(p.on.dash.burn?.dps).toBeGreaterThan(0);
  });

  it('les effets identiques se combinent : le plus fort l’emporte, les charges s’additionnent', () => {
    const p = buildProfile(own('khonsou_attack', 'khonsou_frost'));
    const alone = buildProfile(own('khonsou_attack'));
    expect(p.on.attack.chill).toBe((alone.on.attack.chill ?? 0) + 1);
    const burn = buildProfile(own('ra_dash', 'ra_trail')).on.dash.burn;
    expect(burn?.dps).toBe(buildProfile(own('ra_dash')).on.dash.burn?.dps);
  });

  it('un passif ne prend jamais de case', () => {
    for (const id of ['ra_trail', 'sobek_swirl', 'seth_static', 'neith_arrows', 'isis_knot']) {
      expect(slotOf(must(getBoon(id)).effect), id).toBe('passive');
    }
  });

  it('chaque dieu a au moins 3 passifs', () => {
    for (const god of GOD_IDS) {
      const n = BOONS.filter(
        (b) => b.kind === 'normal' && b.gods.includes(god) && slotOf(b.effect) === 'passive',
      ).length;
      expect(n, god).toBeGreaterThanOrEqual(3);
    }
  });

  it('les bonus des passifs sont dans le profil', () => {
    const p = buildProfile(
      own('sobek_jaws', 'seth_wrath', 'isis_magic', 'isis_wings', 'bastet_purr'),
    );
    expect(p.actionDamage.power).toBeCloseTo(0.2);
    expect(p.wrath).toBeCloseTo(0.4);
    expect(p.superGain).toBeCloseTo(0.25);
    expect(p.dashGuardMs).toBe(120);
    expect(p.purr).toBe(1);
  });

  it('Instinct du chat : bonus contre les ennemis trempés ou givrés', () => {
    const p = buildProfile(own('bastet_instinct'));
    expect(damageMultiplier(p, { burning: false, chilled: false })).toBe(1);
    expect(damageMultiplier(p, { burning: false, chilled: false, soaked: true })).toBeCloseTo(1.25);
    expect(damageMultiplier(p, { burning: false, chilled: true })).toBeCloseTo(1.25);
  });

  it('Contagion solaire n’apparaît qu’avec une source de brûlure', () => {
    const def = must(getBoon('ra_spread'));
    expect(isEligible(def, [], 'ra')).toBe(false);
    expect(isEligible(def, [{ id: 'ra_trail', rarity: 'common' }], 'ra')).toBe(true);
  });
});
