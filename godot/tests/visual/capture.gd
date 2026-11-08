extends SceneTree
## Capture d'écran du jeu pour vérifier l'image (rendu réel, donc avec une fenêtre) :
##   godot --path godot --resolution 1920x1080 --script res://tests/visual/capture.gd -- out=/chemin/image.png
## Options : walk=<x>,<y> (direction tenue), frames=<n> (pas de physique avant la capture, 60 par seconde),
## touch=1 (doigt posé sur le joystick, poussé vers la direction de marche).

var _out := "user://capture.png"
var _walk := Vector2.ZERO
var _frames := 90
var _touch := false


func _initialize() -> void:
	for arg in OS.get_cmdline_user_args():
		var kv := arg.split("=", true, 1)
		if kv.size() != 2:
			continue
		match kv[0]:
			"out":
				_out = kv[1]
			"frames":
				_frames = int(kv[1])
			"walk":
				var p := kv[1].split(",")
				_walk = Vector2(float(p[0]), float(p[1]))
			"touch":
				_touch = kv[1] == "1"
	_run.call_deferred()


func _run() -> void:
	var main: Node = (load("res://src/game/main.tscn") as PackedScene).instantiate()
	root.add_child(main)
	await physics_frame
	var controls: Controls = main.get("controls")
	if _touch:
		var size := root.get_visible_rect().size
		var at := Vector2(110, size.y - 90)
		var down := InputEventScreenTouch.new()
		down.pressed = true
		down.position = at
		root.push_input(down, true)
		var drag := InputEventScreenDrag.new()
		drag.position = at + _walk.normalized() * 24.0
		root.push_input(drag, true)
	elif _walk != Vector2.ZERO:
		controls.touch_move = _walk.normalized()
	for i in _frames:
		await physics_frame
	await process_frame
	await RenderingServer.frame_post_draw
	var img := root.get_texture().get_image()
	img.save_png(_out)
	print("CAPTURE ", _out, " ", img.get_size(), " ", RenderingServer.get_current_rendering_method())
	quit()
