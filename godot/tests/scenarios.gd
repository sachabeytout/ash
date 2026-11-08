extends Node
## Scénarios : la vraie scène du jeu tourne (physique comprise) avec des appuis simulés,
## comme un joueur au clavier ou au doigt. Lancés par tests/run_tests.gd.

const MAIN := "res://src/game/main.tscn"
const PHYSICS_HZ := 60.0

var _main: Node3D


func names() -> Array[String]:
	return [
		"walk_right_keyboard",
		"brakes_after_release",
		"stopped_by_front_wall",
		"stopped_by_jar",
		"azerty_same_keys",
		"touch_joystick",
		"gamepad_buttons_buffered",
		"camera_follows_within_room",
	]


func run(test_name: String, t: TestSuite) -> void:
	_main = (load(MAIN) as PackedScene).instantiate()
	add_child(_main)
	await get_tree().physics_frame
	await call(test_name, t)
	_release_all()
	_main.queue_free()
	await get_tree().process_frame


func walk_right_keyboard(t: TestSuite) -> void:
	var start := _ash().plane_position()
	_key(KEY_D, true)
	await _frames(30)
	var moved := _ash().plane_position() - start
	# 0,5 s : 0,07 s pour atteindre 112 px/s, puis vitesse pleine (≈ 52 px).
	t.near(moved.x, 52.0, "distance parcourue en 0,5 s", 2.5)
	t.near(moved.y, 0.0, "reste sur sa ligne", 0.01)
	t.near(_ash().facing, 0.0, "regarde à droite")


func brakes_after_release(t: TestSuite) -> void:
	_key(KEY_D, true)
	await _frames(20)
	_key(KEY_D, false)
	await _frames(1)
	var x := _ash().plane_position().x
	await _frames(10)
	t.near(_ash().plane_position().x - x, 2.0, "glisse à peine après avoir lâché", 1.5)
	t.eq(_ash().plane_velocity, Vector2.ZERO, "arrêté")


func stopped_by_front_wall(t: TestSuite) -> void:
	_key(KEY_S, true)
	await _frames(90)
	# Bord du sol à y = 64, moins le rayon d'Ash (6 px).
	t.near(_ash().plane_position().y, 58.0, "s'arrête contre le muret du bas", 0.6)


func stopped_by_jar(t: TestSuite) -> void:
	_ash().place(Vector2(-68.8, 20))
	await _frames(1)
	_key(KEY_W, true)
	await _frames(60)
	# Jarre en (-68.8 ; -14.4), rayon 5,8 px ; Ash rayon 6 px.
	t.near(_ash().plane_position().y, -14.4 + 5.8 + 6.0, "bloqué par la jarre", 0.6)


func azerty_same_keys(t: TestSuite) -> void:
	# Sur un clavier AZERTY, la touche Z est à la place du W : c'est la position qui compte.
	var e := InputEventKey.new()
	e.physical_keycode = KEY_W
	e.keycode = KEY_Z
	e.pressed = true
	Input.parse_input_event(e)
	await _frames(10)
	t.check(_ash().plane_velocity.y < -50.0, "Z (AZERTY) fait monter")


func touch_joystick(t: TestSuite) -> void:
	var start := _ash().plane_position()
	var at := Vector2(100, 280)
	_touch(true, at)
	_drag(at + Vector2(30, 0))
	await _frames(30)
	t.check(_controls().touch_move.is_equal_approx(Vector2(1, 0)), "joystick poussé à fond vers la droite")
	t.near(_ash().plane_position().x - start.x, 52.0, "avance comme au clavier", 2.5)
	_touch(false, at + Vector2(30, 0))
	await _frames(2)
	t.eq(_controls().touch_move, Vector2.ZERO, "doigt levé : plus de déplacement")
	var right_side := Vector2(500, 200)
	_touch(true, right_side)
	await _frames(5)
	t.eq(_controls().touch_move, Vector2.ZERO, "moitié droite de l'écran : pas de joystick")
	_touch(false, right_side)


func gamepad_buttons_buffered(t: TestSuite) -> void:
	var e := InputEventJoypadButton.new()
	e.button_index = JOY_BUTTON_A
	e.pressed = true
	# Sans vraie manette branchée, l'évènement est donné directement à la fenêtre du jeu.
	get_viewport().push_input(e)
	await _frames(1)
	var c := _controls()
	t.eq(c.last_device, Controls.Device.GAMEPAD, "manette reconnue")
	t.check(c.buffer.peek(&"dash", c.now_ms()), "✕/A mémorise un dash")


func camera_follows_within_room(t: TestSuite) -> void:
	_key(KEY_D, true)
	_key(KEY_S, true)
	await _frames(150)
	var cam: FollowCamera = _main.get("camera")
	# Ash est bloqué dans le coin bas-droit ; la caméra l'a rejoint, sans sortir des limites.
	var expected := CameraMath.clamp_center(_ash().plane_position(), cam.half_view(), cam.bounds)
	var pitch := deg_to_rad(FollowCamera.PITCH_DEG)
	var ground := cam.global_position - Vector3(0, sin(pitch), cos(pitch)) * FollowCamera.DISTANCE
	t.near_vec(Units.to_plane(ground), expected, "centre de la vue", 0.5)
	t.near(cam.rotation.x, -pitch, "inclinée à 50°")


func _ash() -> Player:
	return _main.get("player")


func _controls() -> Controls:
	return _main.get("controls")


func _frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame


func _key(code: Key, down: bool) -> void:
	var e := InputEventKey.new()
	e.physical_keycode = code
	e.keycode = code
	e.pressed = down
	Input.parse_input_event(e)


func _touch(down: bool, at: Vector2) -> void:
	var e := InputEventScreenTouch.new()
	e.index = 0
	e.position = at
	e.pressed = down
	# Positions en coordonnées de l'interface (640 de large), comme vues par le jeu.
	get_viewport().push_input(e, true)


func _drag(at: Vector2) -> void:
	var e := InputEventScreenDrag.new()
	e.index = 0
	e.position = at
	get_viewport().push_input(e, true)


func _release_all() -> void:
	for code in [KEY_W, KEY_A, KEY_S, KEY_D]:
		_key(code, false)
	var pad := InputEventJoypadButton.new()
	pad.button_index = JOY_BUTTON_A
	pad.pressed = false
	Input.parse_input_event(pad)
