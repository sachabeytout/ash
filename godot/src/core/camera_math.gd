class_name CameraMath
extends RefCounted
## Caméra qui suit Ash (traduit de `RunScene.setupCamera` / `followPlayer`).

## Fraction du chemin parcourue à chaque image à 60 images/s (Phaser : `startFollow(..., 0.14, 0.14)`).
const FOLLOW_LERP := 0.14
## Marge autour de la salle que la caméra peut montrer (px).
const BOUNDS_MARGIN := 36.0


## Même suivi qu'à 60 images/s, quelle que soit la cadence réelle (120 Hz sur iPhone récent).
static func follow_factor(dt_s: float) -> float:
	return 1.0 - pow(1.0 - FOLLOW_LERP, dt_s * 60.0)


## Centre de vue gardé dans `bounds` ; si la vue est plus grande que les limites, elle se centre.
static func clamp_center(center: Vector2, half_view: Vector2, bounds: Rect2) -> Vector2:
	return Vector2(
		_clamp_axis(center.x, half_view.x, bounds.position.x, bounds.end.x),
		_clamp_axis(center.y, half_view.y, bounds.position.y, bounds.end.y)
	)


static func _clamp_axis(c: float, half: float, lo: float, hi: float) -> float:
	if hi - lo <= half * 2.0:
		return (lo + hi) * 0.5
	return clampf(c, lo + half, hi - half)
