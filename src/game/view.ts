import Phaser from 'phaser';
import { settings } from '../core/settings';
import { GAME_HEIGHT } from './theme';

/**
 * Netteté : le jeu est pensé en 640 × 360 (coordonnées « logiques »), mais l'image est dessinée à la
 * résolution réelle de l'écran (jusqu'à ×3), sinon le navigateur agrandit une petite image et les
 * textes deviennent flous. Chaque caméra est donc zoomée de `RENDER_SCALE` : les scènes continuent de
 * travailler en coordonnées logiques via `viewSize`.
 */
function computeRenderScale(): number {
  if (typeof window === 'undefined') return 1;
  // `?res=1` force la résolution (tests automatiques : sans carte graphique, la haute résolution est lente).
  const forced = Number(new URLSearchParams(window.location.search).get('res'));
  if (forced >= 1) return Math.min(3, forced);
  const physical = Math.min(window.innerWidth, window.innerHeight) * (window.devicePixelRatio || 1);
  // Plafond selon la qualité : moins de pixels à dessiner sur les téléphones modestes. En Haute,
  // l'image fait exactement la taille de l'écran (aucun agrandissement par le navigateur = net).
  const cap = settings.quality === 'low' ? 2 : settings.quality === 'medium' ? 3 : 4;
  return Math.min(cap, Math.max(1, physical / GAME_HEIGHT));
}

/** Facteur de rendu, fixé au lancement (après le chargement des réglages). */
export let RENDER_SCALE = 1;

export function initRenderScale(): void {
  RENDER_SCALE = computeRenderScale();
}

/** Zoom propre à certaines scènes (la salle de combat est vue de plus près). */
export const SCENE_ZOOM: Record<string, number> = { run: 2 };

/** Taille visible en coordonnées logiques (ce que valait `scene.scale` avant la haute résolution). */
export function viewSize(scene: Phaser.Scene): { width: number; height: number } {
  return { width: scene.scale.width / RENDER_SCALE, height: scene.scale.height / RENDER_SCALE };
}

/** Position d'un pointeur en coordonnées logiques d'écran. */
export function screenPoint(p: { x: number; y: number }): { x: number; y: number } {
  return { x: p.x / RENDER_SCALE, y: p.y / RENDER_SCALE };
}

/**
 * Chaque scène démarre avec sa caméra zoomée et cadrée sur l'écran logique (comme un défilement à 0).
 * Une scène peut ensuite recadrer elle-même (`centerOn`) : elle passe après.
 */
export function installHighResolution(): void {
  const proto = Phaser.Scenes.Systems.prototype as unknown as {
    start: (data?: object) => void;
  };
  const original = proto.start;
  proto.start = function (this: Phaser.Scenes.Systems, data?: object) {
    original.call(this, data);
    const scene = this.scene;
    const cam = this.cameras.main;
    const frame = () => {
      const { width, height } = viewSize(scene);
      cam.centerOn(width / 2, height / 2);
    };
    cam.setZoom(RENDER_SCALE * (SCENE_ZOOM[this.settings.key] ?? 1));
    frame();
    this.scale.on('resize', frame);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', frame));
  };
}
