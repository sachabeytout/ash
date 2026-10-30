/** Réglages du joueur (options). Valeurs par défaut ; la sauvegarde viendra les remplacer. */
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
};

export const settings: Settings = { ...DEFAULT_SETTINGS };
