/**
 * Raccourcis de test, actifs seulement en développement ou avec `?cheats` dans l'adresse (menu caché) :
 * B = un dieu offre un don, N = vide la salle, G = remplit la jauge de Super.
 */
export const cheatsEnabled =
  import.meta.env.DEV || new URLSearchParams(location.search).has('cheats');
