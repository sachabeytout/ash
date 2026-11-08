class_name FollowCamera
extends Camera3D
## Caméra orthographique inclinée à 50° (décision « Direction artistique des décors ») qui suit Ash
## comme la caméra du jeu d'origine : même suivi doux, même marge autour de la salle,
## et la même surface de sol visible (320 × 180 px du jeu d'origine sur un écran 16:9).

const PITCH_DEG := 50.0
## Profondeur de sol visible (px) : 360 px de haut à l'écran, zoom 2 dans la salle de combat.
const VISIBLE_DEPTH_PX := 180.0
const DISTANCE := 40.0

var target: Node3D
## Limites de la salle dans le plan du jeu (px), marge comprise.
var bounds := Rect2(-1e6, -1e6, 2e6, 2e6)
var ground_height := 0.0

var _center := Vector2.ZERO


func _ready() -> void:
	# Déplacée à chaque image affichée (et non à chaque pas de physique) : pas d'interpolation.
	physics_interpolation_mode = Node.PHYSICS_INTERPOLATION_MODE_OFF
	projection = Camera3D.PROJECTION_ORTHOGONAL
	keep_aspect = Camera3D.KEEP_HEIGHT
	var pitch := deg_to_rad(PITCH_DEG)
	size = Units.m(VISIBLE_DEPTH_PX) * sin(pitch)
	rotation = Vector3(-pitch, 0, 0)
	near = 1.0
	far = DISTANCE * 3.0


## Limites de la salle (px), agrandies de la marge du jeu d'origine.
func set_room(room: Rect2) -> void:
	bounds = room.grow(CameraMath.BOUNDS_MARGIN)


## Place la caméra sur Ash sans glisser (début de salle).
func snap() -> void:
	if target:
		_center = _clamped(Units.to_plane(target.global_position))
	_apply()


func _process(delta: float) -> void:
	if target == null:
		return
	var goal := Units.to_plane(target.get_global_transform_interpolated().origin)
	_center = _center.lerp(goal, CameraMath.follow_factor(delta))
	_center = _clamped(_center)
	_apply()


## Demi-taille de la vue au sol (px) : largeur selon l'écran, profondeur fixe.
func half_view() -> Vector2:
	var vp := get_viewport().get_visible_rect().size
	var aspect := vp.x / maxf(vp.y, 1.0)
	return Vector2(VISIBLE_DEPTH_PX * aspect * 0.5, VISIBLE_DEPTH_PX * 0.5)


func _clamped(c: Vector2) -> Vector2:
	return CameraMath.clamp_center(c, half_view(), bounds)


func _apply() -> void:
	var pitch := deg_to_rad(PITCH_DEG)
	var look_at_ground := Units.to_world(_center, ground_height)
	global_position = look_at_ground + Vector3(0, sin(pitch), cos(pitch)) * DISTANCE
