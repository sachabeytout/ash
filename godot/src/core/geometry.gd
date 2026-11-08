class_name Geometry
extends RefCounted
## Petits calculs de géométrie, sans rien du moteur (traduits de src/core/geometry.ts et de Player.ts).
## Les positions du jeu sont dans le plan du sol, en pixels logiques du jeu d'origine (voir Units).


## Vecteur de longueur 1 (ou nul si le vecteur est nul).
static func normalize(v: Vector2) -> Vector2:
	var len := v.length()
	return v / len if len > 0.0 else Vector2.ZERO


## Rapproche `value` de `target` d'au plus `step` (sans dépasser la cible).
static func approach(value: float, target: float, step: float) -> float:
	return minf(target, value + step) if value < target else maxf(target, value - step)


## Écart entre deux angles, ramené dans [0, π].
static func angle_delta(a: float, b: float) -> float:
	var d := fmod(absf(a - b), TAU)
	return TAU - d if d > PI else d
