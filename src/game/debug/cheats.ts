/**
 * Raccourcis de test, actifs seulement en développement ou avec `?cheats` dans l'adresse (menu caché) :
 * en salle : B = un dieu offre un don, N = vide la salle, G = remplit la jauge de Super,
 * L = fait venir un élite, O = va au boss,
 * M = +100 éclats, Y = un ennemi de chaque type du biome ;
 * dans la Cage : X = +100 XP et +10 pièces d'arme, U = débloque toutes les armes,
 * V = victoire factice (fait avancer l'histoire), Z = montre la vraie fin.
 */
export const cheatsEnabled =
  import.meta.env.DEV || new URLSearchParams(location.search).has('cheats');
