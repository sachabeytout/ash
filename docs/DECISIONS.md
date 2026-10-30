# Journal des décisions

Format : date — décision — raison — validée par l'utilisateur (oui / non / en attente).

## Décisions issues du brief (validées)

| Date       | Décision                                                                                                                  | Raison                                                                     | Validée                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------- |
| 2026-10-30 | Le jeu est une **PWA** hébergée sur **GitHub Pages**, déployée par **GitHub Actions**                                     | Pas de compte Apple payant ; installable sur l'écran d'accueil, hors ligne | oui                                            |
| 2026-10-30 | Stack : Phaser 4 (WebGL), TypeScript strict, Vite, vite-plugin-pwa, Vitest, Playwright, ESLint + Prettier, Arcade Physics | Léger, fiable sur mobile, testable                                         | oui                                            |
| 2026-10-30 | Pas de renderer Canvas (déprécié en Phaser 4)                                                                             | Pérennité                                                                  | oui                                            |
| 2026-10-30 | Vue de dessus, pixel art + néons + ombres, univers cyberpunk sombre                                                       | Direction artistique                                                       | oui                                            |
| 2026-10-30 | Téléphone en paysage ; joystick flottant + 4 boutons ; clavier/souris + manette sur Mac                                   | Contrôles                                                                  | oui                                            |
| 2026-10-30 | Vibrations : Android uniquement, désactivables                                                                            | Safari iOS ne les supporte pas                                             | oui                                            |
| 2026-10-30 | Export / import de sauvegarde obligatoire + `navigator.storage.persist()`                                                 | Filet de sécurité, transfert téléphone ↔ Mac                               | oui                                            |
| 2026-10-30 | 7 armes dont 4 imposées (katana, doubles lames, bâton à pierre, arbalète) et 1 tardive                                    | Souhait de l'utilisateur                                                   | oui                                            |
| 2026-10-30 | 4 biomes (10/10/10/7 salles) + 4 boss, marchand entre biomes, choix entre 2 portes, 5 types de récompenses                | Structure de run                                                           | oui (nombre de salles en attente : question A) |
| 2026-10-30 | Dons des dieux (3 panthéons), choix 1 parmi 3, duos, amplifications, définis comme données                                | Système central                                                            | oui                                            |
| 2026-10-30 | Hub unique : la cage à oiseau géante                                                                                      | Minimalisme                                                                | oui                                            |
| 2026-10-30 | Logique pure dans `src/core/` (sans Phaser), contenu dans `src/data/`, textes dans `src/i18n/`                            | Architecture testable                                                      | oui                                            |
| 2026-10-30 | Anti-frustration = critère de design central                                                                              | Priorité de l'utilisateur                                                  | oui                                            |

## Décisions prises par Claude (petites, réversibles)

| Date       | Décision                                                                                                                           | Raison                                                                                                                                                                                              | Validée    |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 2026-10-30 | **TypeScript 6.0** (et non 7.0)                                                                                                    | TS 7.0 (réécriture en Go) n'est pas encore pris en charge par l'outil de vérification de code (typescript-eslint accepte < 6.1). Migration prévue dès qu'il le sera. Aucune différence pour le jeu. | à signaler |
| 2026-10-30 | Versions retenues : Phaser 4.2.1, Vite 8.3, vite-plugin-pwa 2.0, Vitest 5.0, Playwright 1.64, ESLint 10, Prettier 3.9, Node 24 LTS | Dernières versions stables compatibles entre elles (vérifié sur npm le 30/10/2026)                                                                                                                  | à signaler |
| 2026-10-30 | Résolution interne **640×360**, mise à l'échelle FIT (bandes noires sur les écrans très allongés)                                  | Point de départ simple ; à revoir au prototype M1 (mode EXPAND possible pour remplir les téléphones récents)                                                                                        | à signaler |
| 2026-10-30 | Langue choisie automatiquement (français si l'appareil n'est pas en anglais)                                                       | Option de langue manuelle prévue avec le menu Options                                                                                                                                               | à signaler |
| 2026-10-30 | Node.js installé dans `~/.local/node` (sans droits administrateur)                                                                 | Accord de l'utilisateur le 30/10/2026                                                                                                                                                               | oui        |
| 2026-10-30 | Projet rangé dans `~/Documents/ASH`                                                                                                | Choix de l'utilisateur                                                                                                                                                                              | oui        |
| 2026-10-30 | Dépôt public `sachabeytout/ash`, jeu sur https://sachabeytout.github.io/ash/                                                       | Obligatoire pour GitHub Pages gratuit                                                                                                                                                               | oui        |
| 2026-10-30 | Page figée (rien ne déborde) + recadrage répété après chaque rotation                                                              | Corrige le zoom/débordement d'iOS lors des rotations (retour utilisateur)                                                                                                                           | à signaler |
| 2026-10-30 | Écran « Tourne ton téléphone » quand un téléphone est tenu en portrait                                                             | Le jeu se joue en paysage (décision validée) ; réversible                                                                                                                                           | à signaler |

| 2026-10-30 | Mise à l'échelle **EXPAND** (hauteur 360 fixe, largeur qui s'adapte) au lieu de FIT | Remplit les écrans allongés des téléphones récents sans bandes noires ; les commandes tactiles occupent les bords | à signaler |

## Réponses de l'utilisateur (30/10/2026)

| Sujet         | Décision                                                                                                                                                                                              | Validée        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| A. Durée      | 37 salles normales, ~30–40 min, rythme varié                                                                                                                                                          | oui            |
| B. Armes      | 4 imposées + **2 inventées au gameplay différent** (Disque d'Hélios, Gleipnir) + **arme légendaire « épée de chevalier »** (Lame de l'Aube) comme arme tardive. Les Ailes du Phénix sont abandonnées. | oui            |
| C. Appareil   | iPhone 18 Pro, mais le jeu doit être **agréable sur tous les iPhone et Android** → préréglages de qualité obligatoires                                                                                | oui            |
| D. Lore       | L'Oiseleur reste, **avec une dimension divine**. **Plus de malédiction qui empêche le contact** entre Ash et Aelia. **Vraie fin après 10 victoires.**                                                 | oui            |
| D. Sous-titre | **Les Cendres de l'Aube**                                                                                                                                                                             | oui            |
| D. Ash        | Le lore doit dire qu'Ash est **réellement né des cendres de quelque chose / quelqu'un d'important** → proposé : les cendres de l'Aube (le Phénix-Soleil)                                              | oui (principe) |
| Méthode       | « Commence à travailler », poser les questions de lore / gameplay / DA au fil de l'eau                                                                                                                | oui            |

## En attente de l'utilisateur

- Retour sur le lore v0.2 (dimension divine de l'Oiseleur, nouvelle malédiction d'Aelia, arc en 10 victoires).
- Style de la Lame de l'Aube (parade-riposte proposée).
- Caméra zoom ×2 qui suit Ash (2026-10-30, à signaler) : à 1×, Ash ne mesurait que ~4 mm sur un iPhone.
- Un ennemi ne commence une attaque que s'il est visible à l'écran (2026-10-30, anti-frustration).
- Interprétation : « oublie de suivre les bonnes pratiques » compris comme « n'oublie pas de suivre » (2026-10-30, à confirmer).
