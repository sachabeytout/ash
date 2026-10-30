# Architecture (carte du projet)

> Statut : M0 en place (local). Existe déjà : `src/main.ts`, `src/core/rng.ts`, `src/i18n/`,
> `src/platform/` (pwa, device), `src/game/` (config, theme, backdrop, scenes Title + Hub),
> tests `tests/unit/` (rng, i18n) et `tests/e2e/smoke.spec.ts`. Le reste est **prévu**.
> Mettre à jour à chaque session.

## Arborescence

```
.
├── CLAUDE.md                 règles de travail (lu à chaque session)
├── CHANGELOG.md              nouveautés en français simple pour l'utilisateur
├── docs/                     BRIEF (figé), GDD, ARCHITECTURE, ROADMAP, DECISIONS, CREDITS
├── index.html                page unique, meta viewport / safe-area / anti-zoom
├── public/                   icônes PWA, assets statiques non traités par Vite
├── src/
│   ├── main.ts               point d'entrée : config Phaser, enregistrement du service worker
│   ├── core/                 LOGIQUE PURE, sans Phaser, testée par Vitest
│   │   ├── rng.ts            générateur aléatoire à graine
│   │   ├── events.ts         bus d'évènements typé
│   │   ├── save/             sauvegarde versionnée + migrations + export/import
│   │   ├── combat/           calculs de dégâts, statuts (brûlure, gel…)
│   │   ├── boons/            application des dons, duos, amplifications
│   │   ├── run/              génération des salles, récompenses des portes
│   │   └── telemetry.ts      télémétrie locale (durée/salle, cause de mort…)
│   ├── data/                 CONTENU (données typées) : armes, dons, dieux, ennemis, biomes, compétences
│   │   └── validate.ts       vérification au chargement en dev (ID dupliqués, références cassées)
│   ├── i18n/                 fr.json (défaut), en.json, fonction t() avec variables et pluriels
│   ├── game/                 TOUT CE QUI DÉPEND DE PHASER
│   │   ├── scenes/           Boot, Title, Hub (cage), Run, UI, Pause
│   │   ├── entities/         joueur, ennemis, boss (machines à états)
│   │   ├── fx/               hitstop, tremblement, particules, lumières, filtres
│   │   ├── input/            joystick, boutons tactiles, clavier/souris, manette, input buffer
│   │   └── debug/            hitboxes, FPS, téléportation, triche (dev uniquement)
│   └── platform/             PWA, stockage persistant, vibration, visibilitychange
├── tests/
│   ├── unit/                 Vitest (core/, data/, i18n/)
│   └── e2e/                  Playwright (smoke test + captures desktop / mobile paysage)
└── .github/workflows/        CI : install → lint → typecheck → tests → build → deploy Pages
```

## Flux de données

`data/` (contenu) → `core/` (règles, état de la run) → bus d'évènements → `game/` (affichage, sons, entrées)
et `core/telemetry`. `game/` n'écrit jamais l'état directement : il appelle des fonctions de `core/`.

## Où modifier quoi

| Je veux…                               | Fichier(s)                                   |
| -------------------------------------- | -------------------------------------------- |
| Équilibrer un don, une arme, un ennemi | `src/data/`                                  |
| Changer un texte                       | `src/i18n/fr.json` (+ `en.json`)             |
| Changer une règle de calcul            | `src/core/` (+ test associé)                 |
| Changer un visuel / un effet           | `src/game/`                                  |
| Changer le format de sauvegarde        | `src/core/save/` → **ajouter une migration** |
