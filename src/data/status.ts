/** Réglages des états infligés par les dons (brûlure de Râ, gel de Skadi). */
export const STATUS = {
  burn: {
    /** Les dégâts de brûlure tombent par paquets, à ce rythme (ms). */
    tickMs: 500,
  },
  chill: {
    /** Ralentissement par charge de givre (0,12 = −12 % de vitesse). */
    slowPerStack: 0.12,
    /** Au-delà de ce nombre de charges, l'ennemi est gelé sur place. */
    freezeAt: 5,
    freezeMs: 1600,
    /** Les charges disparaissent si on ne les renouvelle pas. */
    durationMs: 3500,
    /** Après un dégel, l'ennemi ne peut pas être regelé tout de suite (pas de gel permanent). */
    immuneAfterThawMs: 2000,
  },
} as const;
