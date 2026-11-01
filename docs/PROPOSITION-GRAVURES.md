# Gravures de Ptah — proposition (retour F8)

Statut : **validé et fait (0.68.0)** : 2 gravures par action et par arme (56), liste et chiffres dans
`src/data/engravings.ts`, textes `engraving.*`.

## Règles (décidées par l'utilisateur, détails proposés par Claude)

- La porte « Modificateur » devient la porte **« Gravure »** (le ciseau de Ptah).
- Elle n'apparaît qu'**une fois par monde** (Bas-Fonds, Nil, Pyramide, Douât) : au plus 4 gravures par run.
- Une gravure ne modifie que **l'attaque**, **l'attaque spéciale**, **la frappe d'élan** (dash puis attaque) ou **le
  tourbillon d'élan** (dash puis attaque spéciale). Jamais le dash ni le Super.
- En prenant la porte : choix de **1 gravure parmi 3**, propres à l'arme équipée.
- Proposition de Claude : **une seule gravure par action**. Une fois l'attaque gravée, les choix suivants portent sur
  les autres actions. Avec ses 4 gravures, l'arme est **éveillée** : nom doré et un petit effet en plus.
- Inspirations (le fonctionnement, pas le contenu) : le marteau de Hadès, les runes de Diablo III (une rune change le
  comportement d'une compétence), les affixes de Dead Cells. Les noms, les effets et la règle « une par action, l'arme
  s'éveille » sont à nous.

## Exemples (une gravure par action et par arme ; la liste complète en aurait 2 par action)

### Khépesh (épée en faucille)

- **Attaque — Croc de faucille** : le dernier coup du combo frappe deux fois (aller-retour de la lame).
- **Spéciale — Ruée du lion** : la ruée traverse les ennemis et peut s'enchaîner une deuxième fois.
- **Frappe d'élan — Taille en croissant** : la frappe laisse une lame de lumière qui file droit devant.
- **Tourbillon d'élan — Moisson** : le tourbillon attire les ennemis proches vers Ash avant de frapper.

### Dagues de fer céleste

- **Attaque — Pluie d'étoiles** : un coup sur cinq lance une dague-étoile qui revient.
- **Spéciale — Éclat météorique** : l'attaque spéciale marque l'ennemi ; tes dagues lui font plus de dégâts 3 s.
- **Frappe d'élan — Pas de l'ombre** : une frappe d'élan dans le dos d'un ennemi est critique.
- **Tourbillon d'élan — Ceinture d'étoiles** : 4 dagues tournent autour d'Ash pendant 2 s.

### Sceptre ouas

- **Attaque — Orbe jumeau** : chaque orbe se divise en deux en touchant.
- **Spéciale — Puits de pouvoir** : la zone explose deux fois.
- **Frappe d'élan — Rayon ouas** : la frappe devient un court rayon qui traverse les ennemis.
- **Tourbillon d'élan — Anneau sacré** : 6 orbes partent en cercle autour d'Ash.

### Arc du désert

- **Attaque — Vent du sud** : une flèche sur trois rebondit vers un autre ennemi.
- **Spéciale — Flèche de Neith** : la flèche chargée explose au bout de sa course.
- **Frappe d'élan — Tir en roulade** : tire 3 flèches en éventail.
- **Tourbillon d'élan — Volée solaire** : la pluie de flèches retombe une deuxième fois.

### Disque de Râ

- **Attaque — Double soleil** : lance deux disques plus petits.
- **Spéciale — Éclipse** : le gros disque s'arrête et tourne sur place 1,5 s avant de revenir.
- **Frappe d'élan — Rebond** : le disque rebondit sur un deuxième ennemi.
- **Tourbillon d'élan — Couronne** : les disques en cercle laissent une traînée de feu.

### Chaîne de Shezmu

- **Attaque — Fouet du pressoir** : le bout du fouet fait double dégâts.
- **Spéciale — Garrot** : le grappin immobilise l'ennemi attrapé pendant 1 s.
- **Frappe d'élan — Balayage** : le fouet frappe en arc très large (demi-cercle).
- **Tourbillon d'élan — Ronde des chaînes** : le tourbillon porte deux fois plus loin.

### Lame de l'Aube

- **Attaque — Aube montante** : chaque coup du combo est plus fort que le précédent.
- **Spéciale — Miroir du soleil** : une parade réussie renvoie aussi les tirs ennemis.
- **Frappe d'élan — Rayon de l'aube** : la frappe projette une onde de lumière devant Ash.
- **Tourbillon d'élan — Zénith** : le tourbillon rend 2 PV par ennemi touché.
