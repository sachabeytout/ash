import { describe, expect, it } from 'vitest';
import { TRACKS } from '../../src/data/music';
import { BIOMES } from '../../src/data/biomes';

describe('musique', () => {
  it('chaque motif fait 16 pas et ne joue que des notes de l’accord', () => {
    for (const [id, track] of Object.entries(TRACKS)) {
      for (const pattern of [track.bass, track.arp, track.kick, track.hat]) {
        expect(pattern, id).toHaveLength(16);
      }
      for (const ch of track.arp) {
        if (ch !== '.') expect(track.chord[Number(ch)], `${id} arp ${ch}`).toBeDefined();
      }
      expect(track.bpm).toBeGreaterThan(40);
      expect(track.progression.length).toBeGreaterThan(0);
    }
  });
});

describe('musique égyptienne', () => {
  it('darbouka, sistre et mélodies : 16 pas, caractères connus, degrés dans la gamme', () => {
    for (const [id, track] of Object.entries(TRACKS)) {
      if (track.darbuka) {
        expect(track.darbuka, id).toHaveLength(16);
        expect(track.darbuka, id).toMatch(/^[DTk.]+$/);
      }
      if (track.sistrum) expect(track.sistrum, id).toMatch(/^[s.]{16}$/);
      for (const bar of track.melody ?? []) {
        expect(bar, id).toHaveLength(16);
        expect(bar[0], `${id} : une mesure ne commence pas par une tenue`).not.toBe('-');
        expect(track.scale, id).toBeDefined();
        for (const ch of bar)
          if (ch !== '.' && ch !== '-') expect(parseInt(ch, 36), id).toBeLessThan(14);
      }
    }
  });

  it('le thème de chaque monde a une darbouka et une flûte (sauf le Comptoir)', () => {
    for (const b of BIOMES) {
      expect(TRACKS[b.music].darbuka, b.id).toBeDefined();
      expect(TRACKS[b.music].melody, b.id).toBeDefined();
    }
  });
});

describe('musique par biome', () => {
  it('chaque biome a son thème et une version boss dans la même tonalité', () => {
    for (const b of BIOMES) {
      const theme = TRACKS[b.music];
      const boss = TRACKS[b.bossMusic];
      expect(b.music).not.toBe(b.bossMusic);
      expect(boss.rootHz, b.id).toBe(theme.rootHz);
      expect(boss.progression, b.id).toEqual(theme.progression);
      expect(boss.bpm, b.id).toBeGreaterThan(theme.bpm);
    }
    expect(new Set(BIOMES.map((b) => b.music)).size).toBe(BIOMES.length);
  });
});
