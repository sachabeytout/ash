class_name TouchJoystick
extends Control
## Joystick tactile (traduit de la partie joystick de src/game/input/TouchControls.ts) : il naît sous le
## pouce sur la moitié gauche de l'écran (joystick « flottant », réglage par défaut du jeu d'origine).
## Il n'apparaît qu'au premier toucher, pour ne pas encombrer l'écran au clavier.
## Les boutons de combat viendront avec le combat.

## Centre de repos, depuis le coin bas-gauche (px de l'interface 640 × 360).
const REST_FROM_CORNER := 74.0
const KNOB_RADIUS := 12.0
const LINE_COLOR := Color(1.0, 0.914, 0.839, 0.35)

var controls: Controls

var _finger := -1
var _center := Vector2.ZERO
var _knob := Vector2.ZERO
var _shown := false


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	# Sur téléphone et tablette, les commandes sont là dès le départ.
	_shown = OS.has_feature("mobile")
	_reset_center()


## Les commandes tactiles sont-elles à l'écran (joueur sur téléphone) ?
func is_shown() -> bool:
	return _shown


func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		var t := event as InputEventScreenTouch
		if t.pressed:
			_on_down(t.index, t.position)
		elif t.index == _finger:
			_on_up()
	elif event is InputEventScreenDrag:
		var d := event as InputEventScreenDrag
		if d.index == _finger:
			_on_move(d.position)


func _on_down(index: int, at: Vector2) -> void:
	_shown = true
	if controls:
		controls.last_device = Controls.Device.TOUCH
	if at.x < size.x * 0.5 and _finger == -1:
		_finger = index
		_center = at
		_on_move(at)
	queue_redraw()


func _on_move(at: Vector2) -> void:
	var offset := at - _center
	_knob = MoveInput.knob_offset(offset)
	if controls:
		controls.touch_move = MoveInput.joystick(offset)
	queue_redraw()


func _on_up() -> void:
	_finger = -1
	if controls:
		controls.touch_move = Vector2.ZERO
	_reset_center()
	queue_redraw()


func _reset_center() -> void:
	_center = Vector2(REST_FROM_CORNER, size.y - REST_FROM_CORNER)
	_knob = Vector2.ZERO


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED and _finger == -1:
		_reset_center()


func _draw() -> void:
	# Joystick flottant : visible seulement sous le pouce.
	if not _shown or _finger == -1:
		return
	draw_arc(_center, MoveInput.JOY_RADIUS, 0.0, TAU, 48, LINE_COLOR, 2.0, true)
	draw_circle(_center + _knob, KNOB_RADIUS, LINE_COLOR, true, -1.0, true)
