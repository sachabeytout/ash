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
| 2026-10-30 | Épreuve de Vesper : 1 salle chronométrée par biome (9 s + 2,6 s/ennemi + 1,5 s/vague), coffre 30 éclats + 15 XP (+10/+5 par biome) ; échec sans pénalité | Variété des salles sans frustration | à signaler |

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
