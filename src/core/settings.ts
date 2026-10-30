export type Quality = 'low' | 'medium' | 'high';
export type LanguageSetting = 'auto' | 'fr' | 'en';

/** Réglages du joueur (options), enregistrés avec la sauvegarde. */
export interface Settings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  screenShake: boolean;
  vibration: boolean;
  aimAssist: boolean;
  damageNumbers: boolean;
  joystick: 'floating' | 'fixed';
  touchButtonScale: number;
  /** Préréglage graphique : moins d'effets sur les petits téléphones. */
  quality: Quality;
  /** Qualité automatique : baisse d'un cran si le jeu rame. */
  autoQuality: boolean;
  language: LanguageSetting;
  /** Bénédiction du Phénix (mode assistance). */
  assist: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.8,
  sfxVolume: 0.8,
  musicVolume: 0.6,
  screenShake: true,
  vibration: true,
  aimAssist: true,
  damageNumbers: true,
  joystick: 'floating',
  touchButtonScale: 1,
  quality: 'high',
  autoQuality: true,
  language: 'auto',
  assist: false,
};

/** Part des particules gardées selon la qualité. */
export const QUALITY_PARTICLES: Record<Quality, number> = { low: 0.35, medium: 0.7, high: 1 };

export const settings: Settings = { ...DEFAULT_SETTINGS };
