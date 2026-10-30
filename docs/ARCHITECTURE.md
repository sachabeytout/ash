# Architecture (carte du projet)

> Statut 0.19.0 — existe : `core/` (rng, geometry, settings, meta, input/buffer, boss/pattern,
> combat/attack+health+status+superGauge, boons/boons, run/waves+rewards+state, save/schema+migrations+codec+store),
> `data/` (player, weapons, enemies, biomes, gods, boons, status, skills, bosses, music, shop), `game/` (scenes Title, Hub,
> Run, Ui, Boon, Pause, Shop ; entities Player, Enemy, Boss, Hittable ; input Controls, TouchControls ; fx/Juice+Lightning ;
> ui/button+ThothPanel+OptionsPanel ; dom/saveDialog ; debug/cheats ; session ; icons ; audio/sfx+music ; textures ;
> physics), `platform/` (pwa, device).
>
> - heat, telemetry (core et game), ui/HeatPanel+DebugPanel. Prévu : events, data/validate. Mettre à jour à chaque session.

### Scènes

`title` → `hub` (Cage) → `run` (une salle ; se relance à chaque porte) + `ui` (calque non zoomé : vie,
jauge de Super, dons, salle, flèches hors écran, commandes tactiles, lancé par `run`) + `boon` (choix 1 parmi 3,
par-dessus). Mort ou sortie → `hub` avec un `RunSummary`.

### Dons, Super, sauvegarde, Thot (où régler quoi)

- Dons (valeurs, raretés, duo, amplification) : `src/data/boons.ts` ; dieux : `src/data/gods.ts`.
- Brûlure / givre / gel : `src/data/status.ts` + `src/core/combat/status.ts`.
- Tirage des dons et profil de combat : `src/core/boons/boons.ts` ; effets en jeu : `RunScene` (section « Dons »).
- Super : `super` dans `src/data/weapons.ts` ; remplissage de la jauge : `PLAYER.superGauge` (`src/data/player.ts`).
- Arbre de Thot : `src/data/skills.ts` + `src/core/meta.ts` ; fenêtre : `src/game/ui/ThothPanel.ts`.
- Sauvegarde : `src/core/save/` (format v1, migrations, empreinte, copie de secours) ; `src/game/session.ts`
  l'écrit à chaque entrée de salle, après un choix de don, en fin de run et quand l'app passe en arrière-plan.
- Raccourcis de test (dev ou `?cheats`) : `src/game/debug/cheats.ts`.

### Boss, élite, pause, options, musique

- Ammit (vie, attaques, télégraphes, phase 2, récompense) : `src/data/bosses.ts` ; choix des attaques :
  `src/core/boss/pattern.ts` ; entité : `src/game/entities/Boss.ts`. La salle de boss = salle `rooms + 1` du biome.
- Élite : `stalker` dans `src/data/enemies.ts` (attaque `charge`) ; salles d'élite : `eliteRooms` dans `src/data/biomes.ts`.
- Pause : `src/game/scenes/PauseScene.ts` (ouverte par `RunScene.openPause`). Options : `src/game/ui/OptionsPanel.ts`,
  réglages dans `src/core/settings.ts` (qualité → `QUALITY_PARTICLES`).
- Musique : motifs dans `src/data/music.ts`, séquenceur dans `src/game/audio/music.ts`.
  Contexte audio unique (`src/game/audio/sfx.ts`) : relance après coupure iOS (`watchAudio`), recréation si bloqué
  (`onAudioReset` → `music.restart`).

### Biomes, marchand (0.5.0)

- Biomes : `src/data/biomes.ts` (salles, ennemis, élite, boss, musique, décor `theme`). Numéro de salle : 0 = marchand,
  1…N = combats, N + 1 = boss (`roomKind` dans `src/core/run/state.ts`) ; `afterBoss` passe au biome suivant.
- Boss : `BOSSES` dans `src/data/bosses.ts` (attaques optionnelles : bite, charge, quake, summon, leap, icefall, sweep).
- Marchand : articles dans `src/data/shop.ts`, achat dans `src/core/shop.ts`, écran `src/game/scenes/ShopScene.ts`.
- Forge de Brokk : paliers dans `src/data/forge.ts`, logique `src/core/forge.ts`, fenêtre `src/game/ui/ForgePanel.ts` ;
  le niveau est figé dans la run (`weaponLevel`) et appliqué par `RunScene.weaponMultiplier`.
- Bénédiction du Phénix : `src/core/assist.ts` (réglage `assist`, compteur `meta.assistDeaths`).
- Sauvegarde **v2** (forge, assistance) : migration 1 → 2 dans `src/core/save/migrations.ts`.
- Attaques d'ennemis : melee, shot (éventail), charge (enchaînée avec `repeat`), runes, beam (rayon).
- Armes à distance : `AttackStep.projectile` / `.zone` (`src/core/combat/attack.ts`) ; la scène les lance via
  `Player.onFire` → `src/game/entities/PlayerShots.ts` (pools). Tous les coups passent par `RunScene.weaponHit`.
  Grappin : `RunScene.grapple` + `Player.pullTo`. Déblocage des armes : `UNLOCK_COST` (`src/data/forge.ts`), sauvegarde v3.
- Dieux : 9 dans `src/data/gods.ts` (panthéon, icône) ; dons dans `src/data/boons.ts` ; effets résumés par
  `buildProfile` ; états étourdi / jugé / affaibli / maudit dans `src/core/combat/status.ts` ; appliqués dans
  `RunScene` (`applyHitEffects`, `weaponHit`, `dashEffects`, `killEnemy`, `hurtPlayer`). Panthéon favorisé par biome :
  `BiomeDef.pantheon` → `rollGod`. Sauvegarde v4 (`lastBreathUsed`).
- Histoire : dialogues dans `src/data/story.ts` (conditions, priorités), choix dans `src/core/story.ts`
  (`nextDialogue`, `markSeen`, sauvegarde v5 `seenDialogues`), affichage `src/game/ui/DialogueBox.ts` (Cage).
  Vraie fin : `src/game/scenes/EndingScene.ts` (10e victoire). Lame de l'Aube : `dawnblade` (garde = `AttackStep.parry`,
  `Player.isParrying` → `RunScene.parry`), débloquée à 5 victoires (`isUnlocked`).
- Mesures d'urgence : valeurs dans `src/data/heat.ts`, calculs `src/core/heat.ts` (`heatModifiers`), fenêtre
  `src/game/ui/HeatPanel.ts` (Cage) ; appliquées dans `RunScene` (PV/vitesse des ennemis, dégâts reçus, budget des
  vagues, prix du marchand) et `summarize` (récompense). Sauvegarde v6 (`meta.heat`, `run.heat`).
- Fontaines : `BiomeDef.fountainRooms` → `roomKind` = `fountain` ; `drinkFountain` (`src/core/run/state.ts`),
  `RunScene.startFountain`.
- Salles spéciales : `src/core/run/special.ts` (`specialRooms` : une épreuve + un évènement par biome). Évènements :
  `src/core/run/events.ts` (`eventOf`, `eventCost`, `takeEvent`, sauvegarde v7 `eventTaken`), fenêtre
  `src/game/scenes/EventScene.ts`, dessins `src/game/scenes/eventIcons.ts`, `RunScene.startEvent` / `openEvent`.
- Rendu néon : `src/game/fx/postfx.ts` (`applyPostFx` : halo ParallelFilters + vignettage selon la qualité), appelé
  par `RunScene.setupCamera`, `HubScene` et les Options. Qualité auto : `src/core/perf.ts` (`tickAutoQuality`),
  `autoLowerQuality` (`postfx.ts`, Cage et run), message `UiScene.toast` ; réglage `autoQuality`.
- Archives de Thot : fiches et compteurs `src/core/codex.ts` (`CODEX`, `recordCodex`, sauvegarde v8 `meta.codex`),
  textes `codex.*` dans `src/i18n/`, fenêtre `src/game/ui/CodexPanel.ts` ; rencontres notées dans `RunScene`
  (`killEnemy`, `defeatBoss`, `onBoonPicked`).
- Récapitulatif de fin de run : compteurs `recordKill` / `recordDamage` et champs du `RunSummary`
  (`src/core/run/state.ts`, sauvegarde v9), fenêtre `src/game/ui/RecapPanel.ts` ouverte par `HubScene.openRecap`.
- Étincelle du Phénix : récompense `spark` (`src/core/run/rewards.ts`, exclue sans don améliorable),
  `rollUpgrades` / `upgradableBoons` (`src/core/boons/boons.ts`), `upgradeBoon` et `pendingSpark` (sauvegarde v10,
  `src/core/run/state.ts`) ; choix via `BoonScene` en mode `upgrade` (`RunScene.offerSpark`).
- Obstacles : dispositions et contournement dans `src/core/arena/obstacles.ts` (`LAYOUTS`, `planObstacles`,
  `steerAround`) ; zones libres `KEEP_OUT` et `RunScene.placeObstacles` / `addObstacleColliders` ; tirs arrêtés dans
  `RunScene.updateShots` et `PlayerShots` (`obstacles`).
- Épreuves de Vesper : salle, temps et coffre dans `src/core/run/trial.ts` (`trialRoom`, `trialTimeMs`, `chestLoot`) ;
  `RunScene.startTrial` / `updateTrial` / `spawnChest`, chrono affiché par `UiScene.showTrial`.
- Télémétrie locale : logique `src/core/telemetry.ts`, stockage `src/game/telemetry.ts` (`ash.telemetry`) ; menu caché
  `src/game/ui/DebugPanel.ts` (5 appuis sur le titre des Options), compteur FPS dans `UiScene`.
- Bouclier frontal (Einherjar) : `shield` dans `src/data/enemies.ts`, `Enemy.blocks` ; runes : attaque `runes`.

### Combat (où régler quoi)

- Durées, dégâts, portées des coups : `src/data/weapons.ts` (anticipation / actif / récupération).
- Ennemis (PV, vitesse, télégraphe, attaque) : `src/data/enemies.ts`.
- Déplacement, dash, invincibilité, buffer, aide à la visée : `src/data/player.ts`.
- Vagues / difficulté par salle : `src/data/biomes.ts` + `src/core/run/waves.ts`.
- Résolution des coups (qui touche qui) : `src/game/scenes/RunScene.ts` avec `core/geometry.hitsArc`.
- Caméra zoom ×2 qui suit Ash ; un ennemi n'attaque que s'il est visible (`RunScene.isOnScreen`).

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
