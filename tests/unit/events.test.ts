import { describe, expect, it } from 'vitest';
import {
  ANVIL_COST,
  EVENT_IDS,
  PRISONER_MAX_HP,
  canTakeEvent,
  eventCost,
  eventOf,
  takeEvent,
} from '../../src/core/run/events';
import { specialRooms } from '../../src/core/run/special';
import { newRun, recordDamage, recordKill, roomKind, summarize } from '../../src/core/run/state';
import { migrate } from '../../src/core/save/migrations';
import { BIOMES } from '../../src/data/biomes';

describe('salles d’évènement', () => {
  it('une salle d’évènement et une épreuve par biome, jamais la même salle', () => {
    for (let seed = 0; seed < 50; seed++) {
      BIOMES.forEach((biome, i) => {
        const { event, trial } = specialRooms(seed, i, biome);
        expect(event).not.toBeNull();
        expect(trial).not.toBeNull();
        expect(event).not.toBe(trial);
      });
    }
  });

  it('la salle d’évènement est bien reconnue comme telle', () => {
    const run = newRun(5, 'katana', 50, 0, 'ra');
    const biome = BIOMES[0];
    if (!biome) throw new Error('biome manquant');
    run.room = specialRooms(run.seed, 0, biome).event ?? 0;
    expect(roomKind(run, biome)).toBe('event');
  });

  it('tous les évènements sortent selon la graine', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 60; seed++) seen.add(eventOf(seed, 0));
    expect(seen.size).toBe(EVENT_IDS.length);
  });

  it('la braise coûte de la vie, jamais mortelle, et appelle un dieu', () => {
    const run = newRun(1, 'katana', 50, 0, 'ra');
    run.pendingBoon = null;
    const cost = eventCost(run, 'ember').hp;
    expect(takeEvent(run, 'ember')).toBe(true);
    expect(run.hp).toBe(50 - cost);
    expect(run.pendingBoon).not.toBeNull();
    // Une seule fois par biome.
    expect(canTakeEvent(run, 'ember')).toBe(false);
    const weak = newRun(1, 'katana', 50, 0, 'ra');
    weak.hp = cost;
    expect(canTakeEvent(weak, 'ember')).toBe(false);
  });

  it('l’âme en cage donne des PV max ; l’enclume coûte des éclats', () => {
    const run = newRun(1, 'katana', 50, 0, 'ra');
    expect(takeEvent(run, 'prisoner')).toBe(true);
    expect(run.maxHp).toBe(50 + PRISONER_MAX_HP);
    const poor = newRun(1, 'katana', 50, 0, 'ra');
    expect(canTakeEvent(poor, 'anvil')).toBe(false);
    poor.shards = ANVIL_COST;
    expect(takeEvent(poor, 'anvil')).toBe(true);
    expect(poor.shards).toBe(0);
    expect(poor.damageBonus).toBeGreaterThan(0);
    // « Rationnement » : l'enclume coûte plus cher.
    expect(eventCost(poor, 'anvil', 1.4).shards).toBeGreaterThan(ANVIL_COST);
  });

  it('une sauvegarde v6 avec une run en cours passe en v7 sans perte', () => {
    const run = newRun(9, 'katana', 50, 0, 'ra') as unknown as Record<string, unknown>;
    delete run.eventTaken;
    const save = migrate({ version: 6, meta: {}, settings: {}, run });
    expect(save.run?.eventTaken).toBe(-1);
    expect(save.run?.seed).toBe(9);
  });
});

describe('statistiques de run (récapitulatif)', () => {
  it('le résumé reprend l’arme, les dons, les salles, les ennemis et les dégâts', () => {
    const run = newRun(3, 'katana', 50, 0, 'ra');
    run.boons = [{ id: 'ra_attack', rarity: 'common' }];
    recordKill(run);
    recordKill(run);
    recordDamage(run, 7);
    recordDamage(run, -3);
    const s = summarize(run, 'death', 'x');
    expect(s.weapon).toBe('katana');
    expect(s.boons).toEqual(run.boons);
    expect(s.kills).toBe(2);
    expect(s.damageTaken).toBe(7);
    expect(s.rooms).toBeGreaterThan(0);
  });

  it('une run v8 en cours passe en v9 avec des compteurs à zéro', () => {
    const run = newRun(9, 'katana', 50, 0, 'ra') as unknown as Record<string, unknown>;
    delete run.kills;
    delete run.damageTaken;
    const save = migrate({ version: 8, meta: {}, settings: {}, run });
    expect(save.run?.kills).toBe(0);
    expect(save.run?.damageTaken).toBe(0);
  });
});

describe('nouveaux évènements (0.26.0)', () => {
  it('le puits appelle un dieu contre des éclats ; l’autel donne de l’XP contre de la vie', () => {
    const run = newRun(1, 'katana', 50, 0, 'ra');
    run.pendingBoon = null;
    expect(canTakeEvent(run, 'well')).toBe(false);
    run.shards = 40;
    expect(takeEvent(run, 'well')).toBe(true);
    expect(run.shards).toBe(0);
    expect(run.pendingBoon).not.toBeNull();
    const other = newRun(2, 'katana', 50, 0, 'ra');
    const xp = other.xp;
    expect(takeEvent(other, 'shrine')).toBe(true);
    expect(other.xp).toBeGreaterThan(xp);
    expect(other.hp).toBe(50 - eventCost(other, 'shrine').hp);
    const weak = newRun(3, 'katana', 50, 0, 'ra');
    weak.hp = eventCost(weak, 'shrine').hp;
    expect(canTakeEvent(weak, 'shrine')).toBe(false);
  });
});
