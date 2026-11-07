/**
 * Difficulté de base de tout le jeu, tous mondes confondus (retour du 06/11/2026 : « trop facile », les ennemis
 * meurent vite et ne sont pas assez nombreux ; choix de l'utilisateur : tout le jeu, nettement, environ +30 %).
 * S'applique avant les Mesures d'urgence. Les boss ne sont pas concernés.
 */
export const DIFFICULTY = {
  /** Vie des ennemis, élites comprises (pas les boss). */
  enemyHp: 1.3,
  /** Budget de menace des vagues : des vagues plus fournies. */
  waveBudget: 1.3,
} as const;

/** Ennemis présents en même temps dans une salle (réserve d'objets réutilisés, sans création en combat). */
export const MAX_ENEMIES = 24;
