class_name Controls
extends Node
## Regroupe clavier, souris, manette et tactile en une seule interface : un vecteur de déplacement,
## une visée éventuelle, et des appuis mémorisés (input buffer). Traduit de src/game/input/Controls.ts.
##
## Les touches sont lues par leur position physique : AZERTY et QWERTY fonctionnent pareil
## (Z/W, Q/A au même endroit).

signal pause_requested

enum Device { KEYBOARD, MOUSE, TOUCH, GAMEPAD }

const MOVE_KEYS: Dictionary[int, Vector2] = {
	KEY_W: Vector2(0, -1),
	KEY_UP: Vector2(0, -1),
	KEY_S: Vector2(0, 1),
	KEY_DOWN: Vector2(0, 1),
	KEY_A: Vector2(-1, 0),
	KEY_LEFT: Vector2(-1, 0),
	KEY_D: Vector2(1, 0),
	KEY_RIGHT: Vector2(1, 0),
}
const ACTION_KEYS: Dictionary[int, StringName] = {
	KEY_J: &"attack",
	KEY_K: &"power",
	KEY_SPACE: &"dash",
	KEY_SHIFT: &"dash",
	KEY_E: &"super",
	KEY_R: &"super",
}
const PAUSE_KEYS: Array[int] = [KEY_ESCAPE, KEY_P]
## Manette (disposition standard) : □/X attaque, △/Y puissante, ✕/A dash, ○/B super, Start pause.
const PAD_BUTTONS: Dictionary[int, StringName] = {
	JOY_BUTTON_X: &"attack",
	JOY_BUTTON_Y: &"power",
	JOY_BUTTON_A: &"dash",
	JOY_BUTTON_B: &"super",
}
## Gâchettes : droite = dash, gauche = super (comme les boutons 7 et 6 de la version d'origine).
const PAD_TRIGGERS: Dictionary[int, StringName] = {
	JOY_AXIS_TRIGGER_RIGHT: &"dash",
	JOY_AXIS_TRIGGER_LEFT: &"super",
}
const TRIGGER_PRESSED_ABOVE := 0.5

var buffer := InputBuffer.new(PlayerData.INPUT_BUFFER_MS)
var move := Vector2.ZERO
## Direction visée explicitement (stick droit), si `has_aim_dir`.
var aim_dir := Vector2.ZERO
var has_aim_dir := false
## Point visé à la souris dans le plan du jeu (px), si `has_mouse_world`.
var mouse_world := Vector2.ZERO
var has_mouse_world := false
var last_device := Device.KEYBOARD
## Déplacement fourni par le joystick tactile.
var touch_move := Vector2.ZERO
## Caméra et hauteur du sol (m), pour retrouver le point visé à la souris.
var camera: Camera3D
var ground_height := 0.0

var _held: Dictionary[int, bool] = {}
var _gate := ReleaseGate.new()
var _triggers_prev: Dictionary[int, bool] = {}


func _ready() -> void:
	# Lu avant Ash à chaque image de physique.
	process_physics_priority = -10


func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		_held.clear()


func _input(event: InputEvent) -> void:
	if event is InputEventKey:
		_on_key(event as InputEventKey)
	elif event is InputEventMouseButton:
		var mb := event as InputEventMouseButton
		if mb.pressed and (mb.button_index == MOUSE_BUTTON_LEFT or mb.button_index == MOUSE_BUTTON_RIGHT):
			last_device = Device.MOUSE
			press(&"power" if mb.button_index == MOUSE_BUTTON_RIGHT else &"attack")
	elif event is InputEventMouseMotion:
		last_device = Device.MOUSE
	elif event is InputEventJoypadButton:
		var jb := event as InputEventJoypadButton
		if jb.pressed:
			last_device = Device.GAMEPAD
			if jb.button_index == JOY_BUTTON_START:
				pause_requested.emit()
			elif PAD_BUTTONS.has(jb.button_index):
				press(PAD_BUTTONS[jb.button_index])


func _on_key(e: InputEventKey) -> void:
	var code := int(e.physical_keycode)
	if not e.pressed:
		_held.erase(code)
		return
	if code in PAUSE_KEYS:
		if not e.echo:
			pause_requested.emit()
		return
	_held[code] = true
	last_device = Device.KEYBOARD
	if ACTION_KEYS.has(code) and not e.echo:
		press(ACTION_KEYS[code])


## Un menu vient de se fermer : on oublie les appuis faits pendant le menu, et le personnage
## ne repart que lorsque le joueur a relâché puis retouché la direction.
func reset_after_menu() -> void:
	buffer.clear()
	_gate.arm()
	move = Vector2.ZERO


func press(action: StringName) -> void:
	buffer.press(action, now_ms())


func now_ms() -> float:
	return float(Time.get_ticks_msec())


func _physics_process(_delta: float) -> void:
	var keys := Vector2.ZERO
	for code: int in _held:
		keys += MOVE_KEYS.get(code, Vector2.ZERO)
	has_aim_dir = false
	var pad := Vector2.ZERO
	var pads := Input.get_connected_joypads()
	if not pads.is_empty():
		var id: int = pads[0]
		pad = Vector2(Input.get_joy_axis(id, JOY_AXIS_LEFT_X), Input.get_joy_axis(id, JOY_AXIS_LEFT_Y))
		if pad.length() > MoveInput.PAD_DEADZONE:
			last_device = Device.GAMEPAD
		var right := Vector2(
			Input.get_joy_axis(id, JOY_AXIS_RIGHT_X), Input.get_joy_axis(id, JOY_AXIS_RIGHT_Y)
		)
		if right.length() > MoveInput.PAD_AIM_THRESHOLD:
			aim_dir = Geometry.normalize(right)
			has_aim_dir = true
			last_device = Device.GAMEPAD
		_poll_triggers(id)
	move = _gate.filter(MoveInput.combine(keys, pad, touch_move))
	_update_mouse_world()


func _poll_triggers(id: int) -> void:
	for axis: int in PAD_TRIGGERS:
		var down := Input.get_joy_axis(id, axis as JoyAxis) > TRIGGER_PRESSED_ABOVE
		if down and not _triggers_prev.get(axis, false):
			last_device = Device.GAMEPAD
			press(PAD_TRIGGERS[axis])
		_triggers_prev[axis] = down


## Souris : point visé sur le sol, dans le plan du jeu.
func _update_mouse_world() -> void:
	has_mouse_world = false
	if last_device != Device.MOUSE or camera == null:
		return
	var screen := get_viewport().get_mouse_position()
	var from := camera.project_ray_origin(screen)
	var dir := camera.project_ray_normal(screen)
	if absf(dir.y) < 0.0001:
		return
	var t := (ground_height - from.y) / dir.y
	mouse_world = Units.to_plane(from + dir * t)
	has_mouse_world = true


## L'aide à la visée s'applique quand aucune visée précise n'est donnée (pas de souris ni de stick droit).
func wants_aim_assist() -> bool:
	return not has_aim_dir and not has_mouse_world
