# CLAUDE.md — ASH

Roguelite d'action en vue de dessus (inspiré de Hadès, 100 % original), PWA pour téléphone (paysage) et Mac.

## Lire d'abord

1. Ce fichier.
2. `docs/ARCHITECTURE.md` pour trouver les bons fichiers **avant** de lire du code.
3. Selon la tâche : `docs/GDD.md` (design), `docs/DECISIONS.md` (ce qui est tranché), `docs/ROADMAP.md` (où on en est).
4. `docs/BRIEF.md` = source de vérité d'origine. **Ne jamais le modifier.**

## L'utilisateur

- Parle **français**, ne code pas et ne lira pas le code. Il joue et donne des retours (~1h30/jour).
- Réponses, CHANGELOG et docs utilisateur en **français simple**, sans jargon.
- Ne jamais lui demander de lancer une commande, éditer un fichier ou déboguer. Si une action est indispensable : étapes cliquables précises.
- **Règle d'or :** tout changement de stack ou de décision validée → expliquer + attendre sa validation. Tracer dans `docs/DECISIONS.md`.
- Petits choix réversibles : décider, noter dans DECISIONS, signaler dans le résumé.
- Il déteste la **frustration** et se sentir **bloqué** (BRIEF §6.9) : critère central.

## Stack

Phaser 4 (WebGL uniquement) · TypeScript strict (6.0, voir DECISIONS) · Vite · vite-plugin-pwa · Vitest · Playwright · ESLint + Prettier · Arcade Physics · GitHub Pages via Actions.

**API Phaser :** consulter `node_modules/phaser/skills/*/SKILL.md` **avant** d'écrire du code Phaser (l'API v4 diffère de la v3 : filtres au lieu de FX/pipelines, `setLighting(true)`, etc.).

## Commandes

Node.js 24 est installé dans `~/.local/node` (pas dans le PATH par défaut) : préfixer chaque commande par
`export PATH="$HOME/.local/node/bin:$PATH";`. git exige les « Command Line Tools » d'Apple.

- `npm run dev` — serveur de développement
- `npm run lint` · `npm run format` · `npm run typecheck` · `npm test` · `npm run e2e`
- `npm run build` — build de production (`BASE_PATH=/<dépôt>/` en CI pour GitHub Pages)
- `npm run icons` — régénère les icônes PWA depuis `public/icon.svg`
- Captures Playwright : `tests/e2e/screenshots/` (desktop + mobile paysage)

## Règles de code

- `src/core/` = logique pure **sans import Phaser**, toujours testée (Vitest).
- `src/data/` = contenu typé (armes, dons, dieux, ennemis, biomes…), validé au chargement en dev.
- `src/game/` = scènes et objets Phaser. N'écrit pas l'état directement : passe par `core/`.
- **Aucun texte en dur** : tout passe par `src/i18n/` (`fr.json` par défaut, `en.json` préparé).
- RNG à graine par run ; machines à états (joueur, ennemis, boss) ; pools d'objets (pas d'allocation dans la boucle) ; bus d'évènements typé.
- Sauvegarde versionnée : tout changement de format = **migration**, jamais de perte de progression. Écriture robuste.
- Outils de debug uniquement en dev ou menu caché.
- Performance : 60 FPS sur téléphone milieu de gamme ; préréglages qualité Bas/Moyen/Haut.
- Lisibilité : couleurs réservées aux dangers, toujours doublées d'une forme/icône (daltonisme).
- Ressource externe → `docs/CREDITS.md` avec licence. Aucun élément de Hadès / Supergiant.
- Conventional Commits, petites unités, `main` toujours jouable.

## Avant de livrer

1. lint + typecheck + tests unitaires + e2e verts.
2. Vérifier visuellement via les captures Playwright (desktop + mobile paysage).
3. Mettre à jour : CHANGELOG (français simple + « Quoi tester »), ROADMAP, ARCHITECTURE, DECISIONS si besoin.
4. Fin de jalon : déployer, puis message avec lien + checklist de test (≤ 5 points) + 3–4 questions précises.
