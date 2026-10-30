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

## En attente de l'utilisateur

- A. Durée des runs / nombre de salles.
- B. Nombre d'armes proposées par Claude (2 ou 3).
- C. iPhone ou Android, modèle.
- D. Validation du lore (`docs/GDD.md`).
