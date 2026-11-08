class_name Motion
extends RefCounted
## Déplacement libre d'Ash (traduit de `Player.updateFreeMotion`) : la vitesse rejoint la vitesse
## voulue avec une accélération (en marchant) ou un freinage (en relâchant).

const MOVING_ABOVE := 0.01
const TURN_ABOVE := 0.2


## Nouvelle vitesse (px/s) après `dt_ms` millisecondes.
static func free_velocity(
	velocity: Vector2,
	move: Vector2,
	speed: float,
	acceleration: float,
	deceleration: float,
	dt_ms: float
) -> Vector2:
	var target := move * speed
	var moving := move.length() > MOVING_ABOVE
	var rate := (acceleration if moving else deceleration) * (dt_ms / 1000.0)
	return Vector2(
		Geometry.approach(velocity.x, target.x, rate), Geometry.approach(velocity.y, target.y, rate)
	)


## Direction du regard (angle dans le plan du jeu) : vers la souris, sinon le stick droit,
## sinon la marche ; sinon elle ne change pas.
static func free_facing(
	current: float,
	origin: Vector2,
	move: Vector2,
	aim_dir: Vector2,
	has_aim_dir: bool,
	mouse_world: Vector2,
	has_mouse_world: bool
) -> float:
	if has_mouse_world:
		return atan2(mouse_world.y - origin.y, mouse_world.x - origin.x)
	if has_aim_dir:
		return atan2(aim_dir.y, aim_dir.x)
	if move.length() > MOVING_ABOVE:
		return atan2(move.y, move.x)
	return current
