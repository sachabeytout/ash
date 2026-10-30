# Roadmap

## Prochaine étape

M1 est terminé : on attend les retours de l'utilisateur sur la 0.4.0 (boss, élite, musique, options) avant de détailler M2.
Pistes M2 proposées : dialogues dans la Cage (Aelia, Thot, Vesper), forge de Brokk (pièces d'arme), mode assistance « Bénédiction du Phénix », biome 2.
Retour sur le lore v0.2 toujours attendu (« quand le fond aura avancé »).

## M0 — Fondations

- [x] Brief enregistré (`docs/BRIEF.md`)
- [x] Versions de la stack vérifiées
- [x] Documents du projet créés
- [x] Node.js 24 LTS installé sur le Mac
- [x] git installé sur le Mac (Command Line Tools d'Apple) + outil gh connecté au compte `sachabeytout`
- [x] Projet Vite + TypeScript strict + Phaser 4
- [x] ESLint + Prettier, Vitest, Playwright
- [x] i18n (`fr.json`, `en.json`) avec variables et pluriels
- [x] Écran titre « Toucher pour commencer » (débloque l'audio) + cage provisoire
- [x] PWA : manifest, icônes, hors ligne, message « Nouvelle version disponible »
- [x] Workflow GitHub Actions (vérifications + déploiement Pages) écrit
- [x] Dépôt public `sachabeytout/ash`, Pages activé, en ligne : https://sachabeytout.github.io/ash/
- [x] **Critère : l'utilisateur installe l'app sur son téléphone et la voit en plein écran** (confirmé, rotation corrigée en 0.1.1)

## M1 — Tranche verticale

### M1.1 — Premier combat (0.2.0) ✅

- [x] Recherche « game feel » résumée dans le GDD
- [x] La cage (hub minimal : choix d'arme, résumé de run)
- [x] Ash : attaque (combo au rythme), puissante, dash ; katana + doubles lames
- [x] 3 ennemis (Rôdeur, Sentinelle, Colosse) avec télégraphes ; apparitions annoncées
- [x] Choix entre 2 portes, 5 types de récompenses (effets provisoires)
- [x] Biome 1 en 10 salles (paramètre de données), difficulté croissante
- [x] Mort → cage (méta en mémoire)
- [x] Contrôles tactile / clavier-souris / manette
- [x] Bruitages synthétisés

### M1.2 — Dons et sauvegarde (0.3.0) ✅

- [x] 3 dieux (Râ, Zeus, Skadi), 13 dons, 1 duo, 1 amplification ; choix 1 parmi 3
- [x] Super (jauge) pour les 2 armes
- [x] Sauvegarde versionnée (méta + run en cours), export / import
- [x] Méta minimale : 5 compétences (arbre de Thot)
- [x] Indicateurs d'ennemis hors écran

### M1.3 — Boss et ambiance (0.4.0) ✅

- [x] 1 élite (le Traqueur)
- [x] Boss 1 : Ammit, la Dévoreuse
- [x] Musique (3 morceaux) ; préréglages de qualité ; menu options et pause

## M2+

À détailler après les retours sur M1.
