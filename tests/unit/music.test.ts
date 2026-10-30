import { describe, expect, it } from 'vitest';
import { TRACKS } from '../../src/data/music';

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
