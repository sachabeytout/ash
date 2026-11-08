extends Node3D
## Première étape de la refonte : Ash (mannequin) se déplace dans la salle égyptienne d'essai.
## Assemble la salle, Ash, les commandes, la caméra et le joystick tactile.

var controls: Controls
var room: TestRoom
var player: Player
var camera: FollowCamera
var joystick: TouchJoystick


func _ready() -> void:
	room = TestRoom.new()
	room.name = "Salle"
	add_child(room)

	controls = Controls.new()
	controls.name = "Commandes"
	add_child(controls)

	player = Player.new()
	player.name = "Ash"
	player.controls = controls
	add_child(player)
	player.global_position = Units.to_world(room.spawn_point(), room.floor_height())
	player.reset_physics_interpolation()

	camera = FollowCamera.new()
	camera.name = "Camera"
	camera.target = player
	camera.ground_height = room.floor_height()
	add_child(camera)
	camera.set_room(room.floor_rect())
	camera.make_current()
	camera.snap()
	controls.camera = camera
	controls.ground_height = room.floor_height()

	var ui := CanvasLayer.new()
	ui.name = "Interface"
	add_child(ui)
	joystick = TouchJoystick.new()
	joystick.name = "Joystick"
	joystick.controls = controls
	ui.add_child(joystick)
