import type { Quality } from './settings';

/**
 * Qualité automatique : on mesure les images par seconde en jeu ; si elles restent trop basses,
 * on baisse d'un cran (jamais l'inverse, pour éviter les va-et-vient).
 */
export const AUTO_WARMUP_MS = 2500;
export const AUTO_WINDOW_MS = 4000;
export const AUTO_MIN_FPS = 48;

export interface AutoQualityState {
  elapsed: number;
  frames: number;
  windowMs: number;
}

export function newAutoQuality(): AutoQualityState {
  return { elapsed: 0, frames: 0, windowMs: 0 };
}

/** Compte une image ; renvoie vrai quand la moyenne d'une fenêtre complète est trop basse. */
export function tickAutoQuality(s: AutoQualityState, dtMs: number): boolean {
  s.elapsed += dtMs;
  // Les premières secondes (chargement, création de la salle) ne comptent pas.
  if (s.elapsed < AUTO_WARMUP_MS) return false;
  // Une très longue image (app en arrière-plan, alerte) fausserait la mesure : on recommence.
  if (dtMs > 500) {
    s.frames = 0;
    s.windowMs = 0;
    return false;
  }
  s.frames++;
  s.windowMs += dtMs;
  if (s.windowMs < AUTO_WINDOW_MS) return false;
  const fps = (s.frames * 1000) / s.windowMs;
  s.frames = 0;
  s.windowMs = 0;
  return fps < AUTO_MIN_FPS;
}

/** Cran inférieur (null si déjà au plus bas). */
export function lowerQuality(q: Quality): Quality | null {
  return q === 'high' ? 'medium' : q === 'medium' ? 'low' : null;
}
