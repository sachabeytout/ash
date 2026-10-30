# BRIEF PROJET — « ASH » (roguelite d'action inspiré de Hadès)

> **Instruction de démarrage pour Claude Code :** ce document est la source de vérité du projet.
> 1. Enregistre-le tel quel dans `docs/BRIEF.md` (ne le modifie plus ensuite ; les évolutions vont dans `docs/DECISIONS.md`).
> 2. Lis la section « Premières actions » tout en bas et suis-la dans l'ordre.
> 3. N'écris aucun code de jeu avant d'avoir terminé les étapes 1 à 4 des « Premières actions ».

---

## 1. Qui est l'utilisateur et comment travailler avec lui

- L'utilisateur parle **français**. Toutes tes réponses, le CHANGELOG et les documents destinés à l'utilisateur sont en français simple.
- Il **n'a aucune compétence en code** et ne compte pas en acquérir : il veut **jouer** et donner des retours. Il ne lira pas le code.
  - Explique les choix techniques en termes simples (à quoi ça sert, pourquoi, quelles limites), sans jargon inutile.
  - Ne lui demande jamais de lancer une commande, d'éditer un fichier ou de déboguer. Si une action de sa part est indispensable (ex. réglage GitHub), donne-lui des étapes cliquables très précises.
- Il dispose d'environ **1h30 par jour**. Rythme visé : il teste 10–20 min une version jouable, donne un retour, tu développes la suite.
- Il veut que tu **suives en permanence les meilleures pratiques** (code, game design, accessibilité, performance mobile) et que tu **te renseignes** (recherche web) quand c'est nécessaire, notamment sur le game design.
- **Règle d'or :** toute modification de la stack technique ou d'une décision de design déjà validée doit lui être **expliquée et validée avant** d'être appliquée. Les décisions validées sont tracées dans `docs/DECISIONS.md`.
- Pose des questions quand un choix de design est ambigu et coûteux à refaire. Pour les petits choix réversibles, décide, note-le dans `docs/DECISIONS.md` et signale-le dans ton résumé.
- Ce qu'il **déteste** : la **frustration** et la **sensation d'être bloqué**. C'est un critère de design central (voir §6.9).

---

## 2. Plateformes cibles et contraintes

- **Cible principale : son téléphone** (iPhone ou Android — à confirmer, voir §10). **Secondaire : son Mac.** Android et navigateurs desktop en bonus.
- **Il ne paiera pas l'Apple Developer Program.** Donc pas d'app iOS native (l'installation gratuite expire tous les 7 jours).
- **Solution retenue et validée : PWA (Progressive Web App)** installable sur l'écran d'accueil, plein écran, jouable hors ligne, hébergée gratuitement sur **GitHub Pages** et déployée automatiquement par **GitHub Actions** à chaque push sur `main`.
- Faits vérifiés (recherche du 30/10/2026) :
  - Apple **a maintenu** les web apps sur l'écran d'accueil dans l'UE (revirement de mars 2024, iOS 17.4). L'utilisateur est en France : OK.
  - Les web apps lancées depuis l'écran d'accueil iOS ne sont **pas** soumises à l'effacement ITP des 7 jours. WebKit accorde `navigator.storage.persist()` selon des heuristiques (notamment le mode web app installée). → Appeler `persist()` au démarrage, et **toujours** proposer un **export/import de sauvegarde** (code texte ou fichier) comme filet de sécurité et pour transférer la progression téléphone ↔ Mac.
  - **Safari iOS ne supporte pas l'API Vibration** : vibrations sur Android uniquement (option désactivable), dégradation silencieuse sur iOS.
  - iOS exige une **interaction utilisateur avant de jouer du son** : écran titre « Toucher pour commencer » qui débloque l'audio.
  - Quota de stockage et mémoire limités sous Safari : garder le jeu léger (objectif : build initial < 10 Mo, chargement < 5 s en 4G).
- Évolution possible plus tard (ne pas faire maintenant, mais ne pas fermer la porte) : emballage **Capacitor** (APK Android natif, vibrations natives) et **Tauri** (app Mac). Garder le code indépendant de la plateforme.

---

## 3. Stack technique (VALIDÉE par l'utilisateur)

| Brique | Choix | Notes |
|---|---|---|
| Moteur | **Phaser 4** (dernière version stable 4.x — vérifier sur npm ; 4.2.1 au 09/07/2026) | Renderer WebGL. Le Canvas renderer est déprécié en v4 : ne pas l'utiliser. |
| Langage | **TypeScript** en mode `strict` | |
| Build / dev | **Vite** | |
| PWA | **vite-plugin-pwa** (Workbox) | manifest, icônes, service worker, mode hors ligne, mise à jour propre (« Nouvelle version disponible — toucher pour recharger »). |
| Tests logiques | **Vitest** | Toute la logique pure (dégâts, dons, récompenses, RNG, sauvegarde, migrations) est testée. |
| Tests E2E / visuels | **Playwright** | Smoke test : le jeu démarre, on entre dans une run, captures d'écran desktop + viewport mobile paysage. Utilise-les pour **vérifier visuellement** ton travail avant de livrer. |
| Qualité | **ESLint + Prettier** | |
| Hébergement | **GitHub Pages** via **GitHub Actions** | Workflow : install → lint → typecheck → tests → build → deploy. Pas de déploiement si un test échoue. Attention au `base` Vite (sous-chemin du dépôt). |
| Physique | **Arcade Physics** de Phaser | Suffisant pour une vue de dessus ; hitboxes simples (cercles/rectangles). |

- **Documentation Phaser pour IA :** le paquet npm `phaser` contient un dossier `skills/` (ex. `node_modules/phaser/skills/filters-and-postfx/SKILL.md`, `physics-arcade`, `input-keyboard-mouse-touch`, `scale-and-responsive`, `v4-new-features`…). **Consulte-les en priorité** plutôt que ta mémoire (l'API v4 diffère de la v3 : filtres au lieu de FX/pipelines, `setLighting(true)`, `Phaser.Actions.AddEffectBloom()`, etc.). Ça économise des tokens et évite des erreurs d'API v3.
- Alternatives écartées (pour mémoire, déjà expliquées à l'utilisateur) : Godot (export web moins fiable sur iOS, build plus lourd, éditeur visuel inutile ici), Unity (lourd sur le web), app native iOS (impossible sans compte payant).

---

## 4. Direction artistique et technique visuelle

- **Vue de dessus classique** (pas isométrique).
- **Pixel art + néons + ombres** : univers **sombre et cyberpunk**.
- Rendu : résolution interne basse (ex. 480×270 ou 640×360, à valider au prototype) mise à l'échelle avec `pixelArt: true`, adaptée au **paysage** et aux **zones sûres** (encoche/Dynamic Island : `env(safe-area-inset-*)`).
- Effets Phaser 4 : glow/bloom sur les éléments néon, éclairage 2D dynamique (lumière d'Ash, projectiles, éléments du décor), vignettage. **Préréglages de qualité** (Bas / Moyen / Haut, détection auto) car le bloom plein écran coûte cher sur les vieux téléphones.
- **Lisibilité avant tout** : le joueur, les ennemis, les projectiles ennemis et les zones dangereuses doivent se distinguer instantanément (couleurs réservées : ex. projectiles ennemis toujours d'une même famille de couleur, télégraphes d'attaque clairement visibles).
- Ressources graphiques : générées par toi (sprites pixel produits par script) et/ou **packs libres CC0** (ex. Kenney). **Toute ressource externe est listée avec sa licence dans `docs/CREDITS.md`.**
- **Propriété intellectuelle :** jeu **inspiré** de Hadès, mais **100 % original** : aucun personnage, nom, visuel, son ou texte de Hadès / Supergiant. Les figures mythologiques (Râ, Anubis, Odin, Athéna…) sont du domaine public, leur interprétation doit être originale.

---

## 5. Contrôles

- **Téléphone tenu à l'horizontale.**
- **Tactile :** joystick virtuel à gauche (proposer fixe ou flottant dans les options ; flottant par défaut), **4 boutons à droite** : Attaque, Attaque puissante, Dash, Super (avec jauge visible). Boutons larges, zones de toucher généreuses, rien qui ne masque l'action.
- **Visée sur mobile :** attaque dans la direction du mouvement / dernière direction, avec **aide à la visée douce** (orientation vers l'ennemi le plus proche dans un cône) — désactivable.
- **Clavier + souris (Mac) :** ZQSD/WASD (détecter la disposition ou proposer les deux) + visée souris ; clic gauche = attaque, clic droit = puissante, Espace/Shift = dash, E ou R = super.
- **Manette** (PS/Xbox) via le gamepad de Phaser.
- **Input buffer** (~100–150 ms) pour que les actions enchaînées ne soient jamais « mangées ». Réponse visuelle dans la même frame que l'entrée.
- Vibrations : Android uniquement, désactivables (voir §2).
- Empêcher zoom, défilement, sélection de texte, menu contextuel et geste « retour » accidentel pendant le jeu.
- **Pause automatique** quand l'app passe en arrière-plan (`visibilitychange`) + sauvegarde.

---

## 6. Game design

### 6.1 Titre et univers
- Titre de travail : **ASH** (à confirmer ; propose 2–3 options de sous-titre).
- Univers : monde **sombre cyberpunk** où se mêlent trois panthéons : **égyptien, grec et nordique**. La lumière a été éteinte sur le monde.

### 6.2 Histoire (base fournie par l'utilisateur — à développer par toi puis à faire valider)
- Le héros s'appelle **Ash** (« cendres »). Il est **l'élu d'une prophétie** et possède un lien avec le **Phénix** : il **renaît toujours de ses cendres**.
- À chaque mort, il **réapparaît dans une cage à oiseau géante** (équivalent de la Maison d'Hadès) : c'est le **hub**.
- Il s'échappe pour **délivrer sa femme d'une malédiction** qui les empêche d'être ensemble, et **ramener la lumière sur le monde**.
- **La narration a une place centrale** : comme dans Hadès, il faut **terminer le jeu plusieurs fois** pour faire progresser l'histoire jusqu'à la vraie fin. Dialogues courts entre les runs et avec les dieux ; l'histoire avance aussi après les morts (jamais de run « pour rien »).
- À toi de proposer (dans `docs/GDD.md`, puis validation par l'utilisateur) : le nom et l'histoire de sa femme, la nature de la malédiction, la prophétie, l'antagoniste / le geôlier de la cage, le rôle des dieux, les 4 boss, et l'arc narratif sur plusieurs victoires.
- **Aucun texte en dur dans le code** : tous les textes passent par des fichiers de traduction (`src/i18n/fr.json` par défaut, `en.json` préparé). Prévoir la pluralisation et les variables.

### 6.3 Combat — ressenti voulu
- **Nerveux mais lisible.** Le joueur ne doit **pas avoir à marteler les boutons** : combos à rythme (enchaînement récompensé par le timing), attaques qui ont du poids, dash qui annule la récupération.
- 4 actions : **attaque simple**, **attaque puissante**, **dash** (avec frames d'invincibilité généreuses), **super** (jauge qui se remplit en infligeant/recevant des dégâts).
- **Checklist « game feel » à appliquer systématiquement** (à faire évoluer avec tes recherches) :
  - hitstop (gel de quelques dizaines de ms sur les coups forts, proportionné à l'impact) ;
  - léger tremblement de caméra (petit ! un tremblement fort donne la nausée), désactivable ;
  - flash blanc de l'ennemi touché, recul (knockback), particules, son d'impact net ;
  - anticipation (wind-up) et télégraphe clair de **toutes** les attaques ennemies ;
  - frames d'invincibilité après un coup reçu, retour visuel/sonore clair des dégâts subis ;
  - easing des mouvements, squash & stretch léger ;
  - nombres de dégâts optionnels.
- Avant d'implémenter le combat, fais une recherche ciblée (combat de Hadès, design d'ennemis, télégraphes, « juice ») et résume en 10 lignes max dans `docs/GDD.md` ce que tu en retiens.

### 6.4 Armes
- **7 armes au total**, dont **une obtenue tard dans le jeu**.
- Imposées par l'utilisateur :
  1. **Épée style katana** ;
  2. **Doubles lames** (comme deux petits sabres laser) ;
  3. **Bâton** surmonté d'une **pierre qui lance des sorts** ;
  4. **Arbalète revisitée** avec une **cadence de tir convenable** (pas de rechargement pénible).
- Les autres : **à proposer par toi** (2 ou 3 selon la réponse à la question ouverte §10-B), cohérentes avec l'univers cyberpunk-mythologique.
- Chaque arme : attaque simple, attaque puissante et super propres ; le dash est commun mais modifiable par les dons.
- **Modificateurs d'armes** en cours de run (équivalent des marteaux de Dédale) et **améliorations permanentes** via les **pièces d'armes** (voir §6.7).

### 6.5 Dons des dieux
- Reprendre le système de **dons des dieux** de Hadès avec **des dieux et des dons nouveaux** issus des trois panthéons.
- Un don s'attache à une action (attaque, puissante, dash, super) ou est passif ; chaque dieu a une identité mécanique claire (ex. brûlure, gel, foudre, malédiction, bouclier…). Raretés (commun → légendaire).
- Choix **1 parmi 3** quand on récupère un don.
- **Dons en duo** : se débloquent quand on possède des dons de **deux dieux précis** ; effets combinés forts.
- **Dons d'amplification** : ne s'appliquent **qu'à des dons déjà obtenus** pour en **amplifier les effets et/ou les capacités** (ex. +X % sur un don précis, ajout d'un effet secondaire, augmentation de zone).
- Les dons sont **des données** (fichiers typés dans `src/data/`) et non du code dispersé : l'équilibrage doit pouvoir se faire sans toucher au moteur.

### 6.6 Structure d'une run
- **4 biomes**, chacun avec une identité visuelle et musicale forte :
  - Biome 1 : **10 salles** puis **boss intermédiaire 1** ;
  - Biome 2 : **10 salles** puis **boss intermédiaire 2** ;
  - Biome 3 : **10 salles** puis **boss intermédiaire 3** ;
  - Biome 4 : **7 salles** puis **boss final**.
- **Un marchand entre chaque biome**, qui propose **1 ou 2 dons** (et éventuellement d'autres articles) contre des **pièces**.
- **Choix des portes** après chaque salle gagnée : **2 portes** au départ, chacune affichant sa récompense parmi :
  - **Don** ; **Pièces** (pour le marchand) ; **Modificateur d'arme** ; **XP** (pour les compétences permanentes) ; **Pièces d'arme** (pour améliorer les armes de façon permanente).
- Varier le rythme : quelques salles **sans combat** ou rapides (coffre, fontaine de soin, évènement narratif) en plus des salles de combat, et des salles « élite » occasionnelles.
- **Durée visée :** 15–20 min sans modificateurs (souhait de l'utilisateur). ⚠️ **Tension identifiée :** 37 salles + 4 boss + 3 marchands en 15–20 min = < 20 s par salle. Recommandation déjà faite à l'utilisateur : garder 37 salles avec un rythme varié et accepter ~30–40 min (la sauvegarde en cours de run rend ça confortable sur mobile). **Réponse en attente (§10-A).** Dans tous les cas : nombre de salles par biome = **paramètre de données**, mesuré et ajusté au prototype (ajouter un chronomètre de run dans l'écran de fin).
- **Sauvegarde en cours de run** (à chaque entrée de salle) : on doit pouvoir fermer l'app à tout moment et reprendre exactement.

### 6.7 Progression permanente (méta)
- **Arbre de compétences** acheté avec l'**XP**.
- **Améliorations d'armes** achetées avec les **pièces d'armes** (et déblocage des armes).
- Ressources conservées à la mort (au moins en partie) : une mort doit **toujours** faire progresser quelque chose.
- **Hub minimaliste : uniquement la cage à oiseau géante**, où l'on choisit son arme, dépense ses ressources et parle aux personnages (dialogues de progression narrative).

### 6.8 Difficulté
- **Difficulté moyenne** par défaut : exigeante mais **pas frustrante**.
- Après la première victoire : **système de modificateurs de difficulté** façon « Pacte du châtiment / Chaleur » de Hadès (nom original à proposer, ex. « Mesures d'urgence » a été évoqué par l'utilisateur) : le joueur active des contraintes pour plus de défi et de récompenses.
- Proposer un **mode assistance** optionnel (ex. réduction de dégâts croissante à chaque mort, comme le God Mode de Hadès), désactivable à tout moment, sans jugement.

### 6.9 Anti-frustration (priorité de l'utilisateur)
- Aucune mort « injuste » : tout danger est télégraphié, aucun dégât hors écran, pas d'ennemi qui apparaît sur le joueur.
- **Jamais bloqué** : progression méta à chaque run, déblocages réguliers, mode assistance, boss avec patterns apprenables, possibilité de reprendre une run sauvegardée.
- Écran de mort/fin de run informatif : ce qui t'a tué, ce que tu as gagné, ce qui est débloqué ensuite.
- Courbe de difficulté mesurée : ajouter de la télémétrie **locale** (durée par salle, cause de mort, PV perdus par salle) consultable dans un menu debug, pour équilibrer à partir des retours.

### 6.10 Audio
- Bruitages **basiques mais nets** (impacts, dash, coups reçus, UI).
- **Musique propre à chaque biome et à chaque boss**, dans l'ambiance sombre cyberpunk : sources **libres de droits (CC0 / licence compatible, notée dans CREDITS.md)** ou musique générée.
- Réglages séparés : volume général / musique / effets.

### 6.11 Options et accessibilité
- Langue, volumes, qualité graphique, tremblement de caméra on/off, vibrations on/off, aide à la visée on/off, joystick fixe/flottant, mode assistance, affichage des dégâts, taille des boutons tactiles.
- Bouton **Exporter / Importer la sauvegarde**.
- Daltonisme : ne jamais transmettre une info uniquement par la couleur (formes/icônes en plus).

---

## 7. Architecture et bonnes pratiques de code

- **Séparer la logique du moteur** : `src/core/` contient la logique pure en TypeScript (calculs de dégâts, application des dons, génération des récompenses et des salles, RNG, sauvegarde) **sans dépendance à Phaser**, testée avec Vitest. `src/game/` contient les scènes et objets Phaser.
- **Contenu piloté par les données** : `src/data/` (armes, dons, dieux, ennemis, salles, biomes, compétences, modificateurs de difficulté) avec des types stricts et une validation au chargement (en dev) qui détecte les erreurs (ID dupliqués, références cassées).
- **RNG à graine** (seed) par run : reproductible, utile pour déboguer et pour les tests.
- **Machines à états** pour le joueur, les ennemis et les boss.
- **Pools d'objets** pour projectiles, particules, ennemis (pas d'allocations dans la boucle de jeu).
- **Bus d'évènements** typé pour découpler gameplay, UI, audio et télémétrie.
- **Sauvegarde versionnée** avec **migrations** (un changement de format ne doit jamais effacer la progression du joueur). Écritures robustes (pas de corruption si l'app est fermée en pleine écriture).
- **Outils de debug** (uniquement en build de dev ou via un menu caché) : afficher les hitboxes, FPS, téléportation à une salle/un boss, donner des dons, invincibilité. Indispensable pour tester vite.
- **Performance** : viser **60 FPS** sur un téléphone milieu de gamme ; atlas de textures ; limiter les lumières dynamiques et les filtres selon le préréglage de qualité ; mesurer.
- Petites unités de travail, commits clairs (Conventional Commits), une branche par jalon si utile ; `main` toujours jouable.

---

## 8. Documentation du projet (économie de tokens sans perte de qualité)

Crée et **maintiens à jour à la fin de chaque session** :

| Fichier | Contenu | Règle |
|---|---|---|
| `CLAUDE.md` | Règles de travail, conventions, commandes, pointeurs vers les docs | **Court (≤ 150 lignes)**, c'est ce qui est relu à chaque session. |
| `docs/BRIEF.md` | Ce document | Ne plus le modifier. |
| `docs/GDD.md` | Game design document vivant : histoire, personnages, armes, dieux, dons, ennemis, boss, biomes, économie, chiffres d'équilibrage | Sections courtes, tableaux. |
| `docs/ARCHITECTURE.md` | **Carte du projet** : arborescence commentée, rôle de chaque module, flux de données, « où modifier quoi » | Permet de trouver le bon fichier sans tout relire. |
| `docs/ROADMAP.md` | Jalons, état d'avancement, prochaine étape | Cocher au fur et à mesure. |
| `docs/DECISIONS.md` | Journal des décisions (date, décision, raison, validée par l'utilisateur oui/non) | Évite de rediscuter ce qui est tranché. |
| `CHANGELOG.md` | Ce qui change à chaque version, **en français simple pour l'utilisateur** + « quoi tester » | Une entrée par version déployée. |
| `docs/CREDITS.md` | Ressources externes et licences | Obligatoire pour toute ressource non générée. |

Principe : avant de lire du code, lis `CLAUDE.md` puis `docs/ARCHITECTURE.md` pour cibler uniquement les fichiers nécessaires.

---

## 9. Jalons

- **M0 — Fondations** : dépôt, outillage (Vite, TS strict, ESLint/Prettier, Vitest, Playwright), CI GitHub Actions → GitHub Pages, PWA (manifest, icônes, hors ligne, mise à jour), écran titre « Toucher pour commencer », i18n en place, docs créées. **Critère : l'utilisateur installe l'app sur son téléphone et la voit se lancer en plein écran.** Donne-lui la marche à suivre pour l'installer (iPhone : Safari → Partager → « Sur l'écran d'accueil » ; Android : Chrome → « Installer l'application »).
- **M1 — Prototype jouable (« tranche verticale »)** : la cage (hub minimal), biome 1 (nombre de salles réglable), Ash avec les 4 actions et **2 armes (katana + doubles lames)**, 3–4 types d'ennemis + 1 élite, ~3 dieux et ~12–15 dons dont **au moins 1 duo et 1 amplification**, choix entre 2 portes avec les 5 types de récompenses, **boss 1**, mort → retour dans la cage, sauvegarde en cours de run, méta-progression minimale (quelques compétences), contrôles tactiles + clavier/souris + manette, bruitages de base et une musique. Game feel soigné dès ce jalon.
- **M2+** (à détailler dans ROADMAP après retours sur M1) : biomes 2–4 et leurs boss, marchands, autres armes (dont l'arme tardive), tous les dieux et dons, arbre de compétences complet, améliorations d'armes, narration multi-victoires, modificateurs de difficulté, mode assistance, options complètes, polish, équilibrage.

**À la fin de chaque jalon :** tests verts → déploiement → entrée CHANGELOG en français simple → message à l'utilisateur avec le lien, une **checklist de test de 5 points max** et **3–4 questions de retour précises** (ex. « Le dash te semble-t-il trop court ? »).

---

## 10. Questions encore ouvertes (à poser à l'utilisateur dès le début, en une seule fois)

- **A. Durée des runs** : (1) 37 salles courtes en 15–20 min, (2) 37 salles normales ~30–40 min avec rythme varié *(recommandé)*, ou (3) moins de salles (~6 par biome) pour tenir 15–20 min ?
- **B. Armes** : 7 au total = les 4 imposées + combien proposées par Claude (2 ou 3) ? L'arme tardive fait-elle partie des propositions de Claude ?
- **C.** iPhone ou Android ? Quel modèle (pour le budget performance) ?
- **D.** Validation du lore proposé dans `docs/GDD.md` (femme d'Ash, malédiction, prophétie, antagoniste, dieux, boss) avant de l'intégrer au jeu.
- Valeurs par défaut supposées si pas de réponse : paysage, joystick flottant + 4 boutons, clavier/souris + manette sur Mac, vibrations Android uniquement.

---

## 11. Premières actions (dans l'ordre)

1. Enregistrer ce document dans `docs/BRIEF.md`.
2. Vérifier les dernières versions stables de Phaser 4, Vite, vite-plugin-pwa, Vitest, Playwright, TypeScript (et l'état de compatibilité entre eux). Si quelque chose contredit la stack validée, **l'expliquer simplement à l'utilisateur et attendre sa validation**.
3. Créer `CLAUDE.md`, `docs/DECISIONS.md` (y reporter les décisions de ce brief), `docs/ROADMAP.md`, `docs/ARCHITECTURE.md` (structure prévue), `CHANGELOG.md`, `docs/CREDITS.md`, et une première version de `docs/GDD.md` incluant **ta proposition de lore** et **tes propositions d'armes**.
4. Envoyer à l'utilisateur, en un seul message en français : un résumé très court de ce qui a été préparé, ta proposition de lore et d'armes (lisible, pas un mur de texte), et les questions ouvertes du §10.
5. Démarrer **M0** (pas besoin d'attendre les réponses pour M0, qui ne dépend pas du design). Ne démarrer **M1** qu'après les réponses A et B (ou, s'il ne répond pas, appliquer les recommandations et le signaler).
