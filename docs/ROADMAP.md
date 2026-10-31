# Roadmap

## Prochaine étape

Le lore avec l'utilisateur, puis l'équilibrage selon ses retours. Les questions en attente sont dans `docs/QUESTIONS.md`.
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
- [x] **M2.5 (0.9.0)** : armes 3 à 6 (bâton à pierre, arbalète, Disque d'Hélios, Gleipnir)
- [x] **M2.6 (0.10.0)** : les 6 autres dieux (Anubis, Bastet, Athéna, Artémis, Thor, Hel), nouveaux dons et duos
- [x] **M2.7 (0.11.0)** : histoire (dialogues dans la Cage, arc des 10 victoires, Lame de l'Aube, vraie fin)
- [x] **M2.8 (0.12.0)** : Mesures d'urgence (6 réglages, récompense +10 %/point), fontaines, télémétrie locale + menu de debug caché
- [x] **M3.1 (0.13.0)** : Épreuves de Vesper (salle chronométrée, coffre ; échec sans pénalité)
- [x] **M3.2 (0.14.0)** : obstacles dans les arènes (6 dispositions, couvert contre les tirs, contournement par les ennemis)
- [x] **M3.3 (0.15.0)** : salles d'évènement (Braise d'Aelia, Âme en cage, Enclume de Brokk), sauvegarde v7
- [x] **M3.4 (0.16.0)** : rendu néon (halo, vignettage selon la qualité) et qualité automatique
- [x] **M3.5 (0.17.0)** : Archives de Thot (29 fiches débloquées à la rencontre), sauvegarde v8
- [x] **M3.6 (0.18.0)** : récapitulatif de fin de run (stats, dons), sauvegarde v9
- [x] **M3.7 (0.19.0)** : Étincelle du Phénix (un don gagne un cran de rareté), sauvegarde v10
- [x] **M3.8 (0.20.0)** : Souvenirs (relire et réécouter les dialogues de la Cage)
- [x] **M3.9 (0.21.0)** : Marques de l'Oiseleur (ennemis Blindés, Rapides, Instables)
- [x] **M3.10 (0.22.0)** : option « Réduire les flashs »
- [x] **0.22.1 → 0.23.0** : 6 nouveaux dialogues ; Archives : armes et habitants de la Cage (41 fiches)
- [x] **M4.1 (0.24.0)** : 4 nouveaux duos (Égide orageuse, Soleil noir, Griffes du tonnerre, Embaumement)
- [x] **M4.2 (0.25.0)** : 5 amplifications (Zeus, Skadi, Anubis, Artémis, Hel)
- [x] **M4.3 (0.26.0)** : 2 évènements (Puits de Ratatosk, Autel de Thot)
- [x] **M4.4 (0.27.0)** : 3 compétences de Thot (Bourse de Ratatosk, Pas de l'ibis, Renaissance), sauvegarde v11
- [x] **M4.5 (0.28.0)** : Exploits (records dans les Archives), sauvegarde v12
- [x] **0.28.1 → 0.29.0** : sons dédiés ; la Cage s'éveille (terminal, enclume, Vesper, braises)
- [x] **M5.1 (0.30.0)** : la Cage niveau 0 (Ash s'y déplace ; stations : râtelier, Brokk, Thot, Archives, Aelia, Mesures, porte) — demandé par l'utilisateur
- [x] **M5.2 (0.31.0)** : le Comptoir de Ratatosk (lieu à part entre les mondes, PNJ, musique) — demandé par l'utilisateur
- [x] **M5.3 (0.32.0)** : pièges (trappes à pics, explosifs) — demandé par l'utilisateur
- [x] **M6.1 (0.33.0)** : les habitants de la Cage parlent (22 répliques avec humour)
- [x] **M6.2 (0.34.0)** : ennemis de soutien (Rebouteux, Porte-bouclier) + Sauteur et Diffuseur
- [x] **M6.3 (0.35.0)** : variantes de boss (débloquées par la 1re victoire, puis 1 fois sur 2)
- [x] **M6.4 (0.36.0)** : salles spéciales (survie, sombre, champion)
- [x] **M6.5 (0.37.0)** : les dieux parlent à l'offre de don (36 répliques) + 8 dialogues de la Cage
- [x] **M6.6 (0.38.0)** : introduction (cendres, feu, Ash qui se lève, fumée qui forme le logo)
- [x] **M6.7 (0.39.0)** : option « Taille du texte » (Normale / Grande)
- [x] **M6.8 (0.40.0)** : décor propre à chaque monde — demandé par l'utilisateur
- [x] **M6.9 (0.41.0)** : une couleur par dieu, reprise partout (cartes, effets, états, flèches) — demandé par l'utilisateur
- [x] **M6.10 (0.42.0)** : rendu à la résolution de l'écran (textes nets) + petits textes +10 % — demandé par l'utilisateur
- [x] **M6.11 (0.43.0)** : premier essai guidé, cartes des dons en pause, présentation des boss, 16 trophées — demandé par l'utilisateur
- [x] **Lore 1/3 (0.44.0)** : les 9 dieux égyptiens et leurs dons (eau et venin nouveaux)
- [x] **0.45.0** : textes des dieux fidèles à la mythologie égyptienne
- [x] **Lore approfondi (v0.4, docs seulement)** : `docs/LORE.md`, en attente de validation
- [x] **0.47.0** : retours de l'utilisateur (coup d'élan, butin en fin de salle, 2 portes, paysage d'office, netteté, Cage, touches…)
- [x] **0.46.0** : Regard d'Amon (défi, faveur royale) et icônes des dieux d'après leurs représentations
- [x] **Lore 2/3 (0.48.0)** : personnages et dialogues (Anii, Ptah, Ratatosk, arc des 10 victoires, vraie fin réécrite)
- [ ] **Lore 3/3** : lieux et boss (Apophis boss final, à battre 10 fois ; vraie fin)
- [ ] **Plus tard (après le lore)** : skins d'Ash, aspects des armes
- [ ] **M3** : finitions — coffres et évènements, préréglages de qualité, équilibrage avec la télémétrie, accessibilité
