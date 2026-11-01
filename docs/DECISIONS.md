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
| 2026-10-30 | La run **commence par un don** (dieu tiré au hasard) ; un don choisi à une porte se choisit **au début de la salle suivante** | Pouvoir dès le départ ; la reprise après fermeture repropose exactement les mêmes dons | à signaler |
| 2026-10-30 | Un seul don par action (attaque, puissante, dash) ; un nouveau **remplace** l'ancien. Raretés Commun / Rare ×1,5 / Épique ×2 | Lisibilité des choix, comme dans le genre | à signaler |
| 2026-10-30 | Gel : 5 charges de givre ; après un dégel, **2 s d'immunité** | Évite le gel permanent (surtout avec les doubles lames) | à signaler |
| 2026-10-30 | Ash est **invincible pendant le Super** | Anti-frustration, le Super est un moment de puissance | à signaler |
| 2026-10-30 | Reprise de run **au début de la salle** où l'on était (sauvegarde à l'entrée de salle) | Conforme au brief ; évite de reprendre au milieu d'un combat | à signaler |
| 2026-10-30 | « Abandonner la run » dans la Cage : demande une confirmation, l'XP gagnée est conservée | Jamais de run « pour rien » | à signaler |
| 2026-10-30 | Le Super n'est pas (encore) modifié par les dons | Simplicité M1 ; des dons de Super pourront venir en M2 | à signaler |
| 2026-10-30 | Préférence : **notification à chaque étape terminée** | Demande de l'utilisateur | oui |
| 2026-10-30 | Boss Ammit : 800 PV, 4 attaques (morsure, charge, onde de choc, invocation), phase 2 à 50 % (+20 % de vitesse) | Patterns apprenables, toujours télégraphiés ; à régler selon les retours | à signaler |
| 2026-10-30 | Sur le boss, le gel ne fait qu'un **sursaut** de 0,45 s | Sinon Skadi rendrait le boss trivial | à signaler |
| 2026-10-30 | À la mort du boss, ses invocations disparaissent | Anti-frustration : pas de mort après la victoire | à signaler |
| 2026-10-30 | Élite « Traqueur » dans les salles 5 et 8 ; +15 XP | Pic de difficulté lisible, récompensé | à signaler |
| 2026-10-30 | Musique **synthétisée en code** (3 morceaux), pas de fichiers audio | 100 % originale, aucune licence, très léger | à signaler |
| 2026-10-30 | Qualité graphique par défaut : **Haute** (Basse/Moyenne réduisent les particules) | Le jeu tourne bien sur iPhone récent ; réglable dans Options | à signaler |
| 2026-10-30 | Pause automatique quand l'app passe en arrière-plan | Conforme au brief | oui (brief) |
| 2026-10-30 | Mise en ligne en avançant `main` jusqu'à la branche de travail une fois les tests verts | Accord de l'utilisateur pour la 0.3.0 | oui |
| 2026-10-30 | Après Ammit, la run continue (marchand puis Givre-Serveur) ; la run est gagnée après le dernier boss disponible | Demande « commence le deuxième biome » ; structure du brief (biomes enchaînés, marchand entre biomes) | oui (brief) |
| 2026-10-30 | Marchand : **Ratatosk**, écureuil messager de la mythologie nordique (interprétation originale) | Il voyage entre les mondes : logique entre deux biomes | à signaler |
| 2026-10-30 | Prix du marchand : soin 30, cœur 45, pierre 40, faveur 60 éclats ; +10 éclats par élite, +30 par boss | Donner enfin un usage aux éclats ; à régler selon les retours | à signaler |
| 2026-10-30 | Einherjar : bouclier frontal qui bloque 85 % des dégâts (pas les effets des dons déjà posés, ni la brûlure) | Mécanique nouvelle et lisible (arc blanc) : le contourner | à signaler |
| 2026-10-30 | Forge de Brokk : 5 niveaux par arme (dégâts, puissante, Super), coûts 1 à 5 pièces | Donner un usage aux pièces d'arme (progression permanente) | à signaler |
| 2026-10-30 | Bénédiction du Phénix : −20 % de dégâts reçus, −2 % de plus par mort, plafond 80 % ; désactivable à tout moment | Mode assistance du brief, sans jugement | à signaler |
| 2026-10-30 | Sauvegarde v2 (migration 1 → 2) | Ajout forge + assistance, sans perte | oui (règle) |
| 2026-10-30 | Biome 3 « Olympe Corporatif » : Hoplite, Harpie-drone, Oracle ; élite Minotaure-Ω (3 charges) ; boss Talos (1400 PV, balayage) | Suite du plan validé (4 biomes, 4 boss) | oui (brief) |
| 2026-10-30 | Biome 4 « La Volière » (7 salles) : Moineau, Corbeau, Geôlier ; élite Héraut (bouclier + rayon) ; boss final l'Oiseleur (1800 PV) | Structure du brief (10/10/10/7) | oui (brief) |
| 2026-10-30 | Message de victoire provisoire : « l'Oiseleur est tombé… mais la Lanterne reste scellée » | Fidèle à l'arc (victoire 1) ; textes définitifs avec la narration (M2.7) | à signaler |
| 2026-10-30 | Armes 3 à 6 à débloquer chez Brokk : bâton 3, arbalète 3, disque 5, Gleipnir 5 pièces | Progression d'armes du brief ; donne un usage fort aux pièces | à signaler |
| 2026-10-30 | Disque rattrapé : +50 % au lancer suivant ; grappin : attire si l'ennemi est petit, sinon tire Ash (invincible pendant le trajet) | Gameplay « lancer-rattraper » et « grappin » du GDD | à signaler |
| 2026-10-30 | Sauvegarde v3 (migration 2 → 3 : armes débloquées) | Sans perte | oui (règle) |
| 2026-10-30 | 6 nouveaux dieux (4 dons chacun), 3 duos, 3 amplifications ; panthéon du biome ×3 | Liste des dieux du GDD | oui (GDD) |
| 2026-10-30 | Exécution d'Anubis et étourdissement long : jamais sur les boss (étourdissement plafonné à 0,4 s) | Les boss doivent rester des combats | à signaler |
| 2026-10-30 | « Dernier souffle » de Hel : une fois par run (sauvegarde v4) | Anti-frustration, sans rendre invincible | à signaler |
| 2026-10-30 | Histoire écrite sur le lore v0.2 (en attente de validation) : dialogues de la Cage + arc des 10 victoires | L'utilisateur lira le lore plus tard ; tout reste modifiable (textes dans `src/i18n/`) | en attente |
| 2026-10-30 | Un seul dialogue par retour dans la Cage, jamais répété ; les étapes de victoire passent dans l'ordre | Ne pas ralentir l'enchaînement des runs | à signaler |
| 2026-10-30 | Lame de l'Aube : garde de 0,36 s, riposte 70 dégâts autour ; débloquée à la 5e victoire | GDD (parade-riposte, 5e victoire) | à signaler |
| 2026-10-30 | Fenrir-Ω : 1100 PV, bond / pluie de glace / morsure / charge, meute en phase 2 | Boss plus mobile qu'Ammit, toujours télégraphié | à signaler |
| 2026-10-30 | Mesures d'urgence : 6 réglages (PV +25 %, vagues +25 %, vitesse +20 %, dégâts +15 %, prix +40 %, sans répit), +10 % de récompense par point ; débloquées après 1 victoire | GDD (chaleur facultative) ; jamais imposées, remise à zéro libre | à signaler |
| 2026-10-30 | Fontaine : une salle calme par biome, soigne 30 % des PV | Respiration au milieu du biome (anti-frustration) | à signaler |
| 2026-10-30 | Télémétrie 100 % locale (300 salles max), visible seulement dans un menu caché | Aider l'équilibrage sans rien envoyer en ligne | à signaler |
| 2026-10-30 | Sauvegarde v6 (migration 5 → 6 : Mesures d'urgence) | Sans perte | oui (règle) |
| 2026-10-30 | Son sur iPhone : le jeu respecte le bouton silencieux (session audio « ambient ») ; l'audio est relancé au retour dans l'app et au toucher suivant, recréé s'il reste bloqué ; audio de Phaser désactivé (tout est synthétisé) | Retour : la musique ne revenait pas après le mode silencieux | à signaler |
| 2026-10-30 | Décor par monde : sous les personnages et les pièges (profondeur 0,5–1,6), couleurs sombres, jamais le rouge des dangers, aucune forme de piège ; placé hors des zones libres | Demande de l'utilisateur (30/10) ; lisibilité d'abord | oui (demandé) |
| 2026-10-30 | Taille du texte : Grande = ×1,2 sur les textes de 12 px et moins (les titres ne bougent pas, la mise en page reste valable) | Demande de l'utilisateur (30/10), lisibilité iPhone | oui (demandé) |
| 2026-10-30 | Introduction ~10 s au premier lancement (passable d'un toucher), mémorisée dans `seenDialogues` (pas de migration) ; montrée une fois aux joueurs existants | Demande de l'utilisateur (30/10) | oui (demandé) |
| 2026-10-30 | Salles spéciales : une par monde (si une salle candidate reste libre) ; survie 25 s (groupes de 2 toutes les 3,5 s, 4 max), sombre (pas de pièges, attaques au-dessus de l'obscurité), champion (élite ×1,8 PV, blindé) ; récompenses 3 portes / +20 éclats | Demande de l'utilisateur (30/10) | oui (demandé) |
| 2026-10-30 | Variantes de boss : débloquées après la 1re victoire contre le boss, puis 50 % de chances (fixé par la graine) ; +15 % PV, 2 attaques en plus, +30 % XP, +1 pièce | Demande de l'utilisateur (30/10) | oui (demandé) |
| 2026-10-30 | Nouveaux ennemis : Rebouteux (soin 14, rayon 90, toutes les 3,5 s), Porte-bouclier (bouclier 12, toutes les 4,5 s), Sauteur (cercle fixé 0,8 s avant, 10 dégâts), Diffuseur (8 tirs) ; pas d'ennemi invisible | Demande de l'utilisateur (30/10) | oui (demandé) |
| 2026-10-30 | Pièges à partir de la salle 3 : trappes à pics (0-2, +1 dès la salle 6 ; 0,65 s sur place avant les pics, 8 + 2/monde dégâts) et explosifs (dès la salle 4, 0-1 +1 ; mèche 0,7 s, rayon 40, 10 + 2/monde) ; blessent aussi les ennemis | Demande de l'utilisateur (30/10) ; toujours annoncés ≥ 0,5 s | oui (demandé) |
| 2026-10-30 | Fontaine dans chaque Comptoir de Ratatosk (30 % des PV, à sec avec « Sans répit ») | Demande de l'utilisateur (30/10) | oui (demandé) |
| 2026-10-30 | Le marchand a son propre lieu entre les mondes (Comptoir de Ratatosk : décor, musique, PNJ qui parle) ; la boutique s'ouvre en s'approchant de l'étal, la porte est ouverte dès l'arrivée | Demande de l'utilisateur (30/10) | oui (demandé) |
| 2026-10-30 | La Cage devient un niveau 0 à parcourir (stations + porte) au lieu d'un menu à boutons ; toucher pour marcher sur téléphone ; arme mémorisée (sauvegarde v13) ; raccourcis 1-7 conservés | Demande de l'utilisateur (30/10) | oui (demandé) |
| 2026-10-30 | Thot : Bourse (15 éclats/niveau, 40-80-120 XP), Pas de l'ibis (−10 %/niveau, 70-140), Renaissance (1 par niveau, 40 % PV, invincible 1,5 s, 250-450) ; sauvegarde v11 | Progression plus longue ; aide anti-frustration choisie par le joueur | à signaler |
| 2026-10-30 | Évènements : Puits de Ratatosk (don contre 40 éclats × Rationnement, moins cher que la faveur du marchand à 60), Autel de Thot (+40 XP contre 15 % PV max, jamais mortel) | Plus de variété de choix | à signaler |
| 2026-10-30 | 5 amplifications à palier fixe : +2 rebonds, +1 charge de givre, +5 % d'exécution, +1 flèche, +50 % malédiction | Chaque dieu a au moins une amplification | à signaler |
| 2026-10-30 | 4 duos : Égide orageuse (24 dégâts, 3 rebonds), Soleil noir (6/s pendant 3 s), Griffes du tonnerre (critique = étourdi 0,45 s, plafonné sur les boss), Embaumement (3 PV) | Chaque dieu a au moins un duo ; plus de builds | à signaler |
| 2026-10-30 | Option « Réduire les flashs » (désactivée par défaut) : voile rouge 0,1 au lieu de 0,28, ennemi touché assombri au lieu de blanc | Accessibilité (photosensibilité) | à signaler |
| 2026-10-30 | Marques de l'Oiseleur : 0 % / 8 % / 14 % / 20 % d'ennemis normaux marqués selon le biome ; Blindé PV ×1,6, Rapide vitesse ×1,35, Instable explosion (rayon 34, alerte 0,85 s, 6 + 2/biome dégâts) ; +3 éclats | Variété des combats, toujours lisible (forme + alerte) | à signaler |
| 2026-10-30 | Étincelle du Phénix : récompense de porte (poids 1, comme les pièces d'arme), 3 dons proposés au cran suivant ; épiques/duos/amplifications exclus ; sauvegarde v10 | Profondeur des builds ; nom et forme originaux | à signaler |
| 2026-10-30 | Récapitulatif de fin de run avant le dialogue de la Cage ; compteurs ennemis/dégâts dans la run (sauvegarde v9) | Comprendre sa mort (anti-frustration) et aider les retours de test | à signaler |
| 2026-10-30 | Archives de Thot : fiche débloquée à la 1re rencontre (ennemi/boss vaincu, don accepté), vides au départ même pour les anciennes sauvegardes (pas d'historique) ; sauvegarde v8 | Narration centrale (BRIEF §6.2), Thot = archiviste | à signaler |
| 2026-10-30 | Rendu : halo (seuil 0,65, intensité 0,4) en Haute, vignettage en Moyenne/Haute, rien en Basse ; qualité Auto par défaut (baisse d'un cran si < 48 images/s sur 4 s, ne remonte jamais seule) | BRIEF : bloom + préréglages + détection auto ; 60 FPS sur téléphone moyen | à signaler |
| 2026-10-30 | Évènements : 1 salle par biome (remplace un combat) ; Braise d'Aelia (don contre 20 % PV max, jamais mortel), Âme en cage (+5 PV max), Enclume de Brokk (+10 % dégâts, 35 éclats × Rationnement) ; une fois par biome (sauvegarde v7) | GDD « évènements » ; choix toujours refusables (anti-frustration) | à signaler |
| 2026-10-30 | Obstacles : 6 dispositions (dont vide), seulement en combat et jamais en 1re salle ; bloquent tirs ennemis et la plupart des projectiles d'Ash (pas les zones) ; zones libres garanties (apparition, portes, centre), marge 30 px aux murs | Salles variées, couvert tactique, sans se sentir coincé | à signaler |
| 2026-10-31 | **Look d'Ash (0.53.0, demandé)** : un seul look égyptien, appliqué d'office (cheveux en flamme + braises, diadème, peau bronzée, khôl, collier usekh or/lapis, cœur de braise, pagne de lin, sandales) ; skins des vies passées mis de côté | Demandé ; détails du dessin choisis par Claude | à signaler |
| 2026-10-31 | **Tout égyptien (0.52.0, demandé)** : armes (Khépesh, Dagues de fer céleste, Sceptre ouas, Arc du désert, Disque de Râ, Chaîne de Shezmu ; Lame de l'Aube gardée), ennemis renommés et redessinés, Balance de Maât, Bennu au lieu de Phénix pour les mécaniques, Pierre de Ptah, Jarre ardente, trophées. Gardés : Ash, Anii, Ratatosk, l'Oiseleur, Vesper, les vies passées d'Ash (Phénix, Hō-ō…), identifiants internes | Demandé ; noms choisis par Claude | à signaler |
| 2026-10-31 | **Douât et Apophis (0.51.0)** : ordre Héliopolis → Nil → Volière → Douât (ordre recommandé, en attente de ta réponse) ; la Douât (8 salles) reprend les ennemis de l'Olympe, renommés et redessinés (Ba égaré, Momie de garde, Prophète de l'Isfet, Gardien des portes) ; Apophis = morsure, queue, glissade, anneaux, ténèbres et âmes en phase 2 ; Oiseleur allégé (3e boss) ; migration v19 (monde de la run en cours, Talos → Apophis) | Lore validé ; réglages à signaler | à signaler |
| 2026-10-31 | **Shezmu (0.50.0)** : remplace Fenrir ; attaques = lame en arc (bite large), balayage (sweep), chaînes (nouvelle attaque `hook` : tire Ash vers lui, 8 dégâts), phase 2 = onde (pressoir) + gouttes (icefall) ; variante « en furie » (charge + chacals) ; migration v18 (fiche, variante battue et trophées de Fenrir → Shezmu) | Choix validé (Shezmu) ; réglages à signaler | à signaler |
| 2026-10-31 | **Lore 2/3 (0.48.0)** : Aelia → Anii ; Brokk → **Ptah** appliqué en attendant la réponse (option recommandée, réversible) ; identifiants internes gardés (pas de perte des Archives ni des souvenirs) ; dialogues réécrits selon `docs/LORE.md` (les détails encore en attente, comme les 10 anneaux, les vies passées et Amon révélé à la 8e victoire, sont appliqués comme proposés) ; 3 nouveaux dialogues `v3_…` ; vraie fin réécrite (validée) ; espaces insécables en français | Avancer sans attendre (CLAUDE.md) ; rien n'est perdu | à signaler |
| 2026-10-31 | **Retours de l'utilisateur (0.47.0)** — choix de Claude pour les appliquer : coup d'élan = attaque ≤ 0,26 s après le dash (ou pendant), frappe ×1,6 + arc +50° + élan, tourbillon = puissante ×1,4 à 360° ; bouclier ennemi : angle 100° (au lieu de 120°), se retourne à ~125°/s, garde baissée pendant la récupération ; visée auto : ennemi à 70 px dans un cône de 150°, sinon 140 px / 70° ; butin au centre-bas de la salle ; salles spéciales : éclats au lieu de la 3e porte ; bulles : 50 % de chances, 15 s minimum entre deux, 40 s par habitant ; paysage d'office par rotation CSS ; image à la taille exacte de l'écran (plafond 4 en Haute, 3 en Moyenne, 2 en Basse) et textes lissés. Le système de niveaux / points de compétence a été retiré de la demande par l'utilisateur | Demandé ; réglages à signaler | validé (réglages à signaler) |
| 2026-10-31 | **Regard d'Amon (0.46.0)** : une faveur par monde ; première salle observée tirée dans la 1re moitié des combats simples (dès la salle 2, ni spéciale, ni fontaine, ni avant le boss), puis Amon regarde chaque combat simple suivant tant que la faveur n'est pas obtenue ; 3 défis (sans être touché, 3 ennemis en 3 s, 3 ennemis à l'attaque puissante) ; faveur = choisir 1 dieu parmi 3 pour la porte de don (une porte devient un don s'il n'y en a pas). **Icônes des dieux** redessinées : représentation + détail du pouvoir (demandé) | Choix de l'utilisateur ; réglages de Claude, à signaler | validé (réglages à signaler) |
| 2026-10-31 | **Fidélité à la mythologie égyptienne (0.45.0, demandé)** : textes corrigés (Anubis = gardien de la balance et non juge, pesée du _cœur_ ; Ammit dévore, ne pèse pas ; « Égide » grecque → Bouclier de Saïs ; « Neuf vies » → Gardienne de Bubastis ; faits réels ajoutés aux fiches des dieux). Gardé : la glace de Khonsou (invention assumée, froid des nuits ; validée par l'utilisateur) ; jaune pour Seth (sa couleur sacrée est le rouge, mais le rouge est déjà Râ et proche du danger) ; vague pour Sobek | Respect du mythe sans toucher au gameplay | à signaler |
| 2026-10-31 | **Idée centrale du lore (utilisateur)** : Ash (la cendre) + Anii (l'étincelle) = **la libération, le renouveau**. Le Bennu qui naît de leurs flammes à la fin est un **symbole** (espoir, solution), pas un nouveau dieu qu'ils deviennent | Choix de l'utilisateur | validé |
| 2026-10-31 | **Boss du 2e monde (utilisateur)** : **Shezmu, le Bourreau** remplace le Sphinx de givre (voulu « plus flippant », toujours égyptien). Proposé par Claude parmi Am-heh et Babi | Choix de l'utilisateur | validé |
| 2026-10-31 | **Amon (utilisateur)** : le roi caché qui a ouvert la cage en secret (révélé tard). En jeu : **le Regard d'Amon** — un défi discret pendant une salle (ex. finir sans être touché) ; réussi → **faveur royale** en fin de salle (ex. choisir le dieu de la prochaine porte). Pas de porte, pas de coût (pour ne pas ressembler au Chaos de Hadès) | Choix de l'utilisateur | validé |
| 2026-10-31 | **Les 9 dieux (utilisateur, 0.44.0)** : Râ feu, Sobek eau, Khonsou glace, Seth foudre, Serket poison, Anubis brisement + exécution, Bastet force, Isis soin (uniquement), Neith bouclier (choisie par Claude : son emblème est un bouclier). Ratatosk reste le marchand (il a suivi Ash depuis le monde scandinave). Claude : nouveaux états **trempé** (ralenti, foudre ×1,5, givre ×2) et **venin** (doses cumulées, 8 max) ; un don par dieu et par action ; anciens dons convertis par la migration v15 (les flèches d'Artémis, Colère d'Asgard et l'Œil de la chasseresse disparaissent) | Choix de l'utilisateur ; Neith et les mécaniques à signaler | validé |
| 2026-10-31 | **Lore v0.3, suite (utilisateur)** : femme du héros = **Anii** ; Apophis s'allie à l'Oiseleur (donnant-donnant) et pose la malédiction ; la cage était déjà ouverte (par les dieux, révélé plus tard) ; les dieux aident à lever la malédiction ; battre Apophis 10 fois ; Ash retrouve la mémoire pendant qu'Anii la perd (romance tragique) ; vraie fin : le vrai Bennu naît des flammes d'Ash et Anii qui s'embrassent, puis redeviennent cendres. 9 dieux au total | Choix de l'utilisateur | validé |
| 2026-10-31 | **Lore v0.3 (utilisateur)** : dieux uniquement égyptiens (remplace « toutes les cultures ») ; le héros est un dieu sans pouvoir appelé « Bennu », qui a déjà sauvé d'autres mythologies (Phénix, Hō-ō, Fenghuang) ; l'Oiseleur, ennemi de toujours, veut l'encager pour détruire les dieux et ramener le chaos ; il a maudit le héros et sa femme. Propositions de Claude dans `docs/GDD.md` (Lore v0.3), en attente. Rien ne change en jeu avant validation | Choix de l'utilisateur | validé |
| 2026-10-31 | Lore — dieux (réponse de l'utilisateur) : dieux prisonniers de toutes les cultures (fini les seuls 3 panthéons ; éviter l'Olympe, trop proche de Hadès) ; feu = Râ ; soin / bouclier = Isis. Le reste (Sedna, Raijin, Wadjet, Thor brisement, Bastet, Anubis, Hel, traits d'oiseau, nom du méchant) attend sa réponse (`docs/QUESTIONS.md` 15 ter à 15 sexies). Aucun changement en jeu pour l'instant | Choix de l'utilisateur | validé (en partie) |
| 2026-10-31 | Premier essai guidé (0.43.0, demandé) : bulles contextuelles (bouger, attaquer, esquiver, puissante, Super, portes), texte selon l'appareil (tactile / clavier / manette) et commande tactile entourée ; continue sur les runs suivantes tant que tout n'a pas été montré ; « Passer l'aide » l'arrête pour toujours | Éviter l'abandon des nouveaux joueurs sans les ralentir | à signaler |
| 2026-10-31 | Présentation des boss (0.43.0, demandé) : 2,3 s à chaque combat de boss (bandes noires, caméra sur le boss, nom + sous-titre) ; Ash et le boss attendent pendant ce temps | Donner du poids aux boss sans risque de coup gratuit | à signaler |
| 2026-10-31 | Trophées (0.43.0, demandé « grands objectifs ») : 16 trophées (victoires, armes, ennemis vaincus, boss, variantes, dieux, Archives, rapidité, Mesures d'urgence, runs, Thot), récompense XP / pièces remise automatiquement en revenant dans la Cage ; la progression d'avant compte. Sauvegarde v14 (migration) | Donner des buts sur plusieurs runs ; rien à « réclamer » (anti-frustration) | à signaler |
| 2026-10-31 | Pas de bouton « Repartir » en fin de run (refusé par l'utilisateur : retour à la Cage pour s'améliorer). Skins d'Ash : plus tard, après le lore | Choix de l'utilisateur | validé |
| 2026-10-30 | Netteté (0.42.0, demandé) : le canevas est dessiné à la résolution réelle de l'écran (`RENDER_SCALE` = hauteur physique / 360, plafonné à 3 en Haute, 2 en Moyenne, 1,5 en Basse ; fixé au lancement). Les scènes restent en 640 × 360 logiques : chaque caméra est zoomée de `RENDER_SCALE`, les textes sont rendus à la même résolution. Petits textes +10 % (« Normal »). Tests e2e : un à la fois, 120 s, et `?res=1` (résolution d'origine : sans carte graphique la haute résolution est trop lente) | Textes flous sur iPhone (image 360p agrandie ×3) ; coût GPU limité par la qualité | à signaler |
| 2026-10-30 | Couleurs des dieux (0.41.0, demandé) : Râ rouge-orangé `#ff4a14`, Zeus jaune `#ffe03a`, Skadi cyan glacé, Anubis vert émeraude, Bastet vert citron, Athéna bronze, Artémis argent lunaire, Thor bleu orage, Hel violet. Chaque couleur habille tout ce qui appartient au dieu (cartes, halo d'offre, icônes, traînée d'attaque, états des ennemis, chiffres de dégâts, flèches). Le rouge de Râ reste distinct du rouge-magenta des dangers (teinte écartée d'au moins 25°, testé) et toujours doublé d'une forme (flammes, soleil) | Demande de l'utilisateur ; règle de lisibilité des dangers conservée | à signaler |
| 2026-10-30 | Épreuve de Vesper : 1 salle chronométrée par biome (9 s + 2,6 s/ennemi + 1,5 s/vague), coffre 30 éclats + 15 XP (+10/+5 par biome) ; échec sans pénalité | Variété des salles sans frustration | à signaler |

- **0.54.0 — Pyramide aux cages** (demande : « un biome en rapport avec les pyramides ») : la Volière devient une pyramide
  volée par l'Oiseleur plutôt qu'un 5e monde, pour garder des runs de même durée (identifiant `aviary` gardé : sauvegarde
  intacte). L'Oiseleur, ses créatures d'acier et Vesper restent étrangers à l'Égypte (choix de l'utilisateur) ; l'élite
  devient le Sphinx enchaîné. Plumes qui tombent → grains de sable (`BiomeTheme.sand`).

- **0.55.0 — Direction artistique égyptienne** (demande : « donne une DA égyptienne à tout le jeu ») : remplace le
  « cyberpunk violet » du brief par une « Égypte de néon et de nuit » (or, lapis, turquoise ; cartouches ; cadres à
  frise). Police Marcellus (OFL) pour les textes, chiffres pris dans Philosopher (OFL) car ceux de Marcellus se lisent
  mal (« 1 »/« I », « 0 »/« O ») ; polices incluses dans le jeu (hors ligne). Les barreaux de la Cage restent violets :
  ils appartiennent à l'Oiseleur, étranger à l'Égypte. Étape d'envoi des captures en CI rendue non bloquante (panne
  réseau de GitHub du 31/10 qui avait bloqué la mise en ligne de la 0.54.0).

- **0.56.0 — Musique égyptienne** : mêmes identifiants de morceaux (`lowtown`, `frost`, `aviary`, `olympus`…), nouveaux
  instruments synthétisés (darbouka, sistre, ney, bourdon, cordes pincées), gammes hijaz et double harmonique. Le kick
  électronique reste seulement dans les Bas-Fonds (ville de néon) et sous les boss. Niveaux vérifiés par rendu hors ligne
  (crête ≤ 0,44 au volume maximal). « Musique dans le sable » de l'utilisateur : jeu d'origine inconnu (question 31),
  ambiance désert appliquée à la Pyramide.

- **0.57.0 — Dons (décision de l'utilisateur)** : 4 dons d'action par dieu (attaque, spéciale, dash, Super), plus
  d'amplifications (devenues passifs avec rareté), beaucoup de passifs qui agissent sur les actions sans prendre leur
  case (lot 2). Choix de Claude : les dons de Super réutilisent les effets existants (brûlure, trempé, givre, foudre,
  venin, exécution, critique, soin, bouclier) pour rester lisibles ; Isis reçoit attaque (bouclier qui se recharge) et
  dash (bouclier) ; les passifs de renfort gardent leur condition (n'apparaissent que si le don renforcé est possédé).

- **0.58.0 — 27 passifs** (choix de Claude dans le cadre décidé par l'utilisateur) : 3 par dieu ; les passifs « en plus »
  ajoutent un effet à une action par-dessus le don de la case (le plus fort l'emporte, charges et chances s'additionnent).
  « Critique dans le dos » abandonné (les ennemis se tournent toujours vers Ash) → « Instinct du chat » (bonus contre les
  ennemis ralentis). Ronronnement seulement quand des ennemis sont présents (pas de soin en attendant dans une salle vide).

- **0.60.0 — Menus (retour F1, option C validée)** : en run, la physique est figée tant qu'un menu est ouvert
  (`RunScene.choosing`) ; `Player.halt` à l'ouverture ; à la fermeture `Controls.resetAfterMenu` (appuis oubliés,
  déplacement nul jusqu'au relâchement) et `Player.grace` 500 ms. Choix de Claude : pas de grâce après la pause (évite
  d'enchaîner les pauses pour être intouchable). Cage : marche annulée pendant et après un menu.

- **0.61.0 — Puits d'offrandes + nouveaux dons (retour F2, A + D validés ; Amulettes à reprendre)** : `rollOffer` limite
  les remplacements à `MAX_REPLACEMENTS` = 1 tant qu'il reste des dons nouveaux, puis complète avec des Faveurs (un don du
  dieu gagne un cran, `special: 'favor'`) et une Offrande (+`OFFERING_HP` = 6 PV max, `special: 'offering'`), et
  seulement ensuite d'autres remplacements. 18 passifs « en plus » (2 par dieu), choisis par Claude.

- **0.62.0 — Difficulté (retour F3, A + B + E validés)** : `PLAYER.damageTakenScale` = 0,75 (tous les dégâts reçus, pièges
  compris), `PLAYER.maxHp` 50 → 70, compétence `thoth_ash` « Peau de cendre » (−5 %/niveau, 60/110/170 XP, plafond de
  défense `MAX_ARMOR` = 50 %), calcul dans `src/core/combat/incoming.ts`. Sauvegarde v21 (`perks.armor`). Trophée « Élève
  de Thot » : objectif = nombre de compétences.

- **0.63.0 — Retour F3 annulé par l'utilisateur** : retour à 50 PV et aux dégâts ennemis d'origine ; compétence « Peau de
  cendre » retirée. Sauvegarde v22 : niveaux achetés remboursés en XP (60/110/170), champ `perks.armor` retiré. Une run
  commencée en 0.62.0 garde ses PV max (aucune perte).

- **0.64.0 — Braise (retour F4)** : « Étincelle » → « Braise » (identifiants `spark` gardés : sauvegarde intacte) ;
  icône `drawEmberIcon` (`src/game/icons.ts`), variante B2 choisie par l'utilisateur après 3 séries d'exemples (charbon
  anguleux foncé, réseau fin de fissures, « + » au-dessus du coin droit) ; lueur qui pulse sur la porte.

- **0.65.0 — Dons dans la pause (retour F5, option D)** : `addBoonList` (`src/game/ui/boonCard.ts`) remplace les petites
  cartes : grille compacte (icône + nom, police réduite si besoin, 1 à 3 colonnes) et panneau de détail du don touché
  (description entière, rétrécie si très longue) ; flèches du clavier pour naviguer.

- **0.66.0 — Super (retour F6 : A + effets 1, 2, 3)** : `superTarget` (`src/core/combat/superAim.ts`, ennemi le plus proche à
  `PLAYER.superAimRange` = 260 dans toutes les directions) au lancement et à chaque coup suivant ; `RunScene.superLaunchFx`
  (arrêt 110 ms, zoom ×1,08, flash doré sauf « Réduire les flashs », double onde, 8 hiéroglyphes) ; `Player` : aura dorée
  pulsée et traînée de flammes pendant le Super. Dégâts inchangés.

- **0.67.0 — Révélation des dons (retour F7, option B)** : `BoonScene.revealCard` (dos doré + œil oudjat, retournement
  par `scaleX`, `REVEAL_FIRST_MS` 160, `REVEAL_STEP_MS` 150, `FLIP_HALF_MS` 110 ; choix bloqué jusqu'à la fin). Choix de
  Claude (non confirmé) : éclat de la couleur de rareté pour rare / épique / duo.

- **0.68.0 — Gravures de Ptah (retour F8)** : décidé par l'utilisateur : attaque, spéciale, frappe et tourbillon d'élan
  seulement (pas de dash ni de Super), une porte par monde (`run.engravingBiome`), 2 gravures par action et par arme. Choix
  de Claude : une gravure par action, arme éveillée à 4 gravures (+10 % de dégâts), la porte disparaît quand l'arme est
  éveillée ; ancien « Modificateur » (+10 % caché) retiré (`weaponMod` → `pendingEngraving`). Logique pure
  `src/core/combat/engraving.ts` (`applyEngraving`, `rollEngravings`), données `src/data/engravings.ts`, nouvelles
  mécaniques de tir (`bounces`, `split`, `explodeEnd`, `hover`) dans `PlayerShots`. Sauvegarde v23. Inspiration de
  fonctionnement : marteau de Hadès, runes de Diablo III, Dead Cells ; contenu original.

- **0.70.0 — Fenêtre de départ (retour F10 : B sans forge ; armes verrouillées « grisées, chez Ptah »)** : le
  râtelier disparaît ; « Sortir » ouvre `DeparturePanel` (ancien `WeaponPanel`), l'arme de la dernière run déjà choisie
  (`meta.selectedWeapon`, pas de changement de sauvegarde). Ptah garde améliorations, déblocages et, plus tard, les
  aspects. Choix de Claude : toucher la carte déjà choisie lance la run ; touches 1 à 7 de la Cage ouvrent la fenêtre
  avec cette arme choisie (au lieu de partir directement) ; une silhouette dessinée par arme (`drawWeaponGlyph`) ; le
  niveau de forge en petit en haut à droite du nom (mise en page prévue par le retour F15) ; un nom trop long rapetisse.

- **0.69.0 — Papyrus + arbre de Thot (retour F9 : « Papyrus » ; A + B)** : l'XP s'affiche « Papyrus » (identifiants `xp`
  gardés). 18 compétences en 3 branches (`SkillDef.branch`, `requires`), chacune débloquée par un niveau de la précédente
  (`isSkillUnlocked`) ; achats existants conservés. Choix de Claude : les 10 nouvelles compétences et leurs coûts
  (provisoires, à revoir avec le retour F12) ; « Peau de cendre » non remise (retour F3 annulé). Sauvegarde v24 (nouveaux
  bonus de run).

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

## Retours de l'utilisateur (30/10/2026, après la 0.4.0)

| Sujet      | Retour                                                                             | Suite donnée                                                         |
| ---------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Affichage  | Aucun problème d'affichage ni de son                                               | —                                                                    |
| Difficulté | « Assez dur mais pas frustrant »                                                   | On garde l'équilibrage actuel                                        |
| Lisibilité | Les attaques se voient bien                                                        | —                                                                    |
| Musique    | Elle plaît ; souhaite **une musique par biome** et **une version boss de chacune** | 0.5.1 : thème par biome + version boss (même tonalité, plus intense) |

## En attente de l'utilisateur

- Retour sur le lore v0.2 (dimension divine de l'Oiseleur, nouvelle malédiction d'Aelia, arc en 10 victoires).
- Style de la Lame de l'Aube (parade-riposte proposée).
- Caméra zoom ×2 qui suit Ash (2026-10-30, à signaler) : à 1×, Ash ne mesurait que ~4 mm sur un iPhone.
- Un ennemi ne commence une attaque que s'il est visible à l'écran (2026-10-30, anti-frustration).
- Interprétation : « oublie de suivre les bonnes pratiques » compris comme « n'oublie pas de suivre » (2026-10-30, à confirmer).
