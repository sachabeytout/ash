import Phaser from 'phaser';
import { lowerQuality, tickAutoQuality, type AutoQualityState } from '../../core/perf';
import { settings, type Quality } from '../../core/settings';
import { session } from '../session';

/**
 * Rendu néon de la caméra selon la qualité :
 * - Haute : halo lumineux (les zones claires « bavent » doucement) + bords assombris ;
 * - Moyenne : bords assombris seulement ;
 * - Basse : rien (le plus léger pour les vieux téléphones).
 */
export function applyPostFx(camera: Phaser.Cameras.Scene2D.Camera, quality: Quality): void {
  camera.filters.internal.clear();
  camera.filters.external.clear();
  if (quality === 'low') return;
  if (quality === 'high') {
    const bloom = camera.filters.internal.addParallelFilters();
    bloom.top.addThreshold(0.65, 0.95);
    bloom.top.addBlur(0, 2, 2, 1);
    bloom.blend.blendMode = Phaser.BlendModes.ADD;
    bloom.blend.amount = 0.4;
  }
  camera.filters.external.addVignette(0.5, 0.5, 0.75, 0.35);
}

/**
 * Qualité automatique (Cage et run) : compte une image ; si le jeu rame, baisse d'un cran, enregistre
 * et met le rendu à jour. Renvoie la nouvelle qualité (pour prévenir le joueur), sinon null.
 */
export function autoLowerQuality(
  state: AutoQualityState,
  delta: number,
  camera: Phaser.Cameras.Scene2D.Camera,
): Quality | null {
  if (!settings.autoQuality || !tickAutoQuality(state, delta)) return null;
  const next = lowerQuality(settings.quality);
  if (!next) return null;
  settings.quality = next;
  session.commit();
  applyPostFx(camera, next);
  return next;
}
