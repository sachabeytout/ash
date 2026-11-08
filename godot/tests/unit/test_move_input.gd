extends TestSuite
## Traduction des règles de déplacement de Controls.ts et TouchControls.ts.


func test_keyboard_is_normalized() -> void:
	near_vec(MoveInput.combine(Vector2(1, -1), Vector2.ZERO, Vector2.ZERO), Vector2(1, -1).normalized(), "diagonale")
	eq(MoveInput.combine(Vector2(1, 0) + Vector2(-1, 0), Vector2.ZERO, Vector2.ZERO), Vector2.ZERO, "gauche + droite")


func test_pad_deadzone() -> void:
	eq(MoveInput.combine(Vector2(1, 0), Vector2(0.2, 0.0), Vector2.ZERO), Vector2(1, 0), "stick dans la zone morte : clavier")
	near_vec(MoveInput.combine(Vector2(1, 0), Vector2(0, 0.5), Vector2.ZERO), Vector2(0, 0.5), "stick incliné : valeur brute")


func test_touch_wins() -> void:
	near_vec(MoveInput.combine(Vector2(1, 0), Vector2(0, 0.9), Vector2(-0.5, 0)), Vector2(-0.5, 0), "joystick tactile prioritaire")


func test_joystick_strength() -> void:
	eq(MoveInput.joystick(Vector2(3.5, 0)), Vector2.ZERO, "zone morte (moins de 12 % du rayon)")
	near_vec(MoveInput.joystick(Vector2(12, 0)), Vector2((0.4 - 0.12) / 0.6, 0), "à 40 % du rayon")
	near_vec(MoveInput.joystick(Vector2(0, -21.6)), Vector2(0, -1), "pleine vitesse dès 72 % du rayon")
	near_vec(MoveInput.joystick(Vector2(0, 90)), Vector2(0, 1), "au-delà du bord")
	eq(MoveInput.joystick(Vector2.ZERO), Vector2.ZERO, "doigt au centre")


func test_knob_stays_in_circle() -> void:
	near_vec(MoveInput.knob_offset(Vector2(10, 0)), Vector2(10, 0), "dans le cercle")
	near_vec(MoveInput.knob_offset(Vector2(0, 60)), Vector2(0, 30), "ramené au bord")


func test_release_gate() -> void:
	var gate := ReleaseGate.new()
	near_vec(gate.filter(Vector2(1, 0)), Vector2(1, 0), "sans menu : passe")
	gate.arm()
	eq(gate.filter(Vector2(1, 0)), Vector2.ZERO, "après un menu : bloqué tant que tenu")
	eq(gate.filter(Vector2(0.05, 0)), Vector2.ZERO, "relâché : encore zéro cette image-là")
	near_vec(gate.filter(Vector2(0, 1)), Vector2(0, 1), "retouché : repart")
