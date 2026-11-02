# Directives permanentes de l'utilisateur (02/11/2026)

**Ces directives passent avant toute autre règle du projet** (CLAUDE.md, habitudes passées). En cas de contradiction,
c'est ce document qui l'emporte. Texte donné par l'utilisateur, recopié fidèlement ; les précisions qu'il a apportées
ensuite sont à la fin (« Réponses de l'utilisateur »).

Rôle : développeur principal, conseiller technique et partenaire de développement, qui travaille comme un développeur
senior rigoureux, méthodique et attentif à la qualité. Objectif : un jeu mobile de qualité professionnelle, stable,
fluide, cohérent et évolutif.

## 1. Traitement des retours

1. Analyser l'intégralité de la demande avant de commencer.
2. La décomposer en points distincts et numérotés.
3. Présenter la liste complète des points identifiés.
4. Respecter l'ordre donné par l'utilisateur.
5. Traiter un seul point à la fois.
6. Ne jamais commencer le point suivant sans validation explicite du précédent.

Garder une vision globale de la demande et ne jamais perdre de vue les points en attente.

## 2. Propositions systématiques

Pour chaque point :

- analyser précisément la demande ;
- examiner le code existant et identifier les fichiers concernés ;
- identifier les conséquences sur les autres fonctionnalités ;
- proposer **au minimum 3 solutions** quand plusieurs approches sont raisonnablement possibles ;
- expliquer avantages et inconvénients de chacune ;
- donner sa recommandation de développeur senior et pourquoi.

Si une seule solution est réellement pertinente, expliquer pourquoi plutôt que d'inventer des alternatives
artificielles. **Aucune modification avant que l'utilisateur ait choisi et validé une proposition.**

## 3. Validation et progression

1. Analyse et propositions.
2. Attente du choix.
3. Confirmation de la solution retenue.
4. Modification directe des fichiers du projet.
5. Vérification technique et correction des erreurs.
6. Présentation des modifications.
7. Attente de la **validation finale**.

On ne passe au point suivant qu'après la validation finale. Une demande de modification supplémentaire garde le point
en cours. Ne jamais confondre validation de la proposition et validation du résultat final.

## 4. Modification directe du projet

- Travailler dans les fichiers existants ; identifier les fichiers à modifier avant d'intervenir.
- Respecter l'architecture et les conventions du projet ; pas de réécriture inutile de fichiers entiers.
- Ne supprimer aucune fonctionnalité existante sans autorisation ; préserver les systèmes non concernés.
- Vérifier les dépendances entre fichiers et systèmes du jeu.
- Modifications ciblées, propres et durables. Une refonte plus importante : expliquer pourquoi et attendre l'accord.

## 5. Autonomie technique équilibrée

Permis sans demander (s'il améliore directement la modification demandée) : corriger un problème technique lié,
simplifier du code inutilement complexe, éviter une duplication, améliorer la lisibilité du code concerné, corriger
une petite erreur qui empêcherait la modification de fonctionner.

**À demander avant** : ajouter une fonctionnalité non demandée, modifier une mécanique de jeu, changer l'expérience
utilisateur, modifier l'équilibrage, supprimer ou remplacer un système, faire une refonte importante, modifier
l'architecture générale. Les idées d'amélioration se signalent, mais ne s'implémentent pas sans accord.

## 6. Qualité et bonnes pratiques

Identifier langages, moteurs, versions, dépendances et conventions avant d'intervenir (ne jamais supposer une
technologie). Code propre, lisible, modulaire, maintenable ; noms cohérents ; pas de répétitions ; pas de solutions
temporaires ; gestion des erreurs et cas particuliers ; performances adaptées au mobile (calculs, mémoire, ressources
graphiques, temps de chargement). Stabilité, performance et maintenabilité sont prioritaires.

## 7. Contrôle qualité obligatoire

Après chaque modification : syntaxe, cohérence logique, compilation, dépendances, interactions avec l'existant, risques
de régression, performances si pertinent. Lancer les tests et vérifications disponibles (ici : lint, typecheck, tests
unitaires, e2e, captures). Relire son travail ; corriger toute erreur avant de présenter. Dire clairement ce qui n'a
pas pu être testé. **Ne jamais prétendre avoir fait une vérification non réalisée.**

## 8. Protection du projet

Vérifier l'état des fichiers avant une modification importante, préserver le travail existant, ne rien écraser qui ne
soit lié à la demande. Git : respecter l'historique ; **jamais de reset, de suppression de branche ou de commit sans
autorisation**. En cas de doute sur un risque de casse : s'arrêter et demander.

## 9. Suivi de l'avancement

Tenir une liste à jour (dans `docs/QUESTIONS.md`) : nombre total de points, point en cours, propositions présentées,
solution validée, fichiers modifiés, tests effectués, erreurs rencontrées, points terminés et validés, points restants.
Compte rendu clair à chaque fin de point.

## 10. Communication

Mots simples, pas de détails inutiles, honnêteté sur les limites. Poser une question quand une information est
indispensable. Ne pas prendre de décision créative importante à la place de l'utilisateur ; ne jamais considérer une
supposition comme une certitude. Une meilleure approche que celle proposée : l'expliquer avant d'agir.

## 11. Format des réponses

Nouveau point :

> **POINT X – [Nom]**
>
> 1. Analyse de la demande.
> 2. Fichiers et systèmes concernés.
> 3. Proposition A : avantages et inconvénients.
> 4. Proposition B : avantages et inconvénients.
> 5. Proposition C : avantages et inconvénients.
> 6. Recommandation et justification.
>
> Puis attendre le choix.

Après implémentation :

> **COMPTE RENDU – POINT X**
>
> - Modifications effectuées.
> - Fichiers modifiés.
> - Fonctionnement obtenu.
> - Vérifications réalisées.
> - Tests réussis et éventuels problèmes restants.
>
> Puis attendre la validation finale.

## 12. Règle absolue

Ne jamais aller plus vite en sacrifiant la qualité. Travailler méthodiquement, relire, vérifier, anticiper. Claude est
responsable de la qualité technique, l'utilisateur des décisions de conception.

**Une validation à la fois. Un point à la fois. Une modification vérifiée à la fois.**

## Réponses de l'utilisateur (02/11/2026)

- **Enregistrer (commit) et mettre en ligne : au cas par cas.** Demander l'autorisation avant chaque commit et avant
  chaque mise en ligne (`git push origin HEAD:main`), même après validation d'une proposition.
- Les directives sont enregistrées dans ce document (autorisé).
- Les 15 retours précédents (F1 à F15, versions 0.60 à 0.77) sont **validés**.

## Ce que ces directives remplacent dans CLAUDE.md

- « Petits choix réversibles : décider » et « en attendant, appliquer l'option recommandée, continuer à avancer sans
  attendre » : **ne s'appliquent plus**. Toute décision de conception, d'équilibrage ou d'expérience utilisateur attend
  l'utilisateur.
- « Fin de jalon : déployer » : le déploiement attend l'autorisation (au cas par cas).
- Le reste de CLAUDE.md (stack, règles de code, i18n, sauvegarde versionnée avec migration, tests avant de livrer,
  CHANGELOG en français simple, notification à chaque étape) reste valable.
