/** Réglages des états infligés par les dons (brûlure de Râ, givre de Khonsou, eau de Sobek, venin de Serket). */
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
  soak: {
    /** Un ennemi trempé conduit la foudre : dégâts de foudre ×1,5. */
    lightningMultiplier: 1.5,
    /** … et gèle plus vite : chaque charge de givre compte double. */
    chillMultiplier: 2,
  },
  venom: {
    tickMs: 500,
    /** Les doses s'additionnent jusqu'à ce plafond ; chaque nouvelle dose relance la durée. */
    maxStacks: 8,
    durationMs: 4000,
  },
} as const;
