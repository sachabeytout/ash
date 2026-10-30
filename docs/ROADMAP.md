# Roadmap

## Prochaine étape

M2.5 : armes 3 à 6 (bâton à pierre, arbalète, Disque d'Hélios, Gleipnir). Les questions en attente sont dans `docs/QUESTIONS.md`.
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

## M2 — Le monde s'agrandit

### M2.1 — Le Givre-Serveur (0.5.0) ✅

- [x] Biomes enchaînés (après le boss : marchand, puis biome suivant) ; décor et musique par biome
- [x] Marchand Ratatosk (soin, cœur, pierre runique, faveur d'un dieu) ; éclats des élites et des boss
- [x] 3 ennemis (Loup-relais, Givreur, Gardien runique) + élite Einherjar (bouclier frontal)
- [x] Boss 2 : Fenrir-Ω (bond, pluie de glace, chaînes, meute)

### Plan vers le jeu complet (l'utilisateur répond aux questions dans `docs/QUESTIONS.md` quand il peut)

- [x] **M2.2 (0.6.0)** : forge de Brokk (améliorations d'armes), Bénédiction du Phénix (mode assistance), victoires
- [x] **M2.3 (0.7.0)** : biome 3, l'Olympe Corporatif (ennemis, élite, boss Talos)
- [x] **M2.4 (0.8.0)** : biome 4, la Volière (7 salles, boss l'Oiseleur) → vraie victoire
- [ ] **M2.5 (0.9.0)** : armes 3 à 6 (bâton à pierre, arbalète, Disque d'Hélios, Gleipnir)
- [ ] **M2.6 (0.10.0)** : les 6 autres dieux (Anubis, Bastet, Athéna, Artémis, Thor, Hel), nouveaux dons et duos
- [ ] **M2.7** : histoire (dialogues dans la Cage, arc des 10 victoires, Lame de l'Aube, vraie fin)
- [ ] **M2.8** : Mesures d'urgence, salles variées (fontaines, coffres, évènements), télémétrie + menu de debug caché
