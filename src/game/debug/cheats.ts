/**
 * Raccourcis de test, actifs seulement en développement ou avec `?cheats` dans l'adresse (menu caché) :
 * en salle : B = un dieu offre un don, N = vide la salle, G = remplit la jauge de Super ;
 * dans la Cage : X = +100 XP.
 */
export const cheatsEnabled =
  import.meta.env.DEV || new URLSearchParams(location.search).has('cheats');
