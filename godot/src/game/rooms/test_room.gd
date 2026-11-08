class_name TestRoom
extends Node3D
## Salle d'essai égyptienne : le décor 3D venu de Blender, ses collisions, son éclairage en direct.

const FLAME_HEIGHT := 1.15
const FIRE_LIGHT_HEIGHT := 1.35

var _fire: OmniLight3D
var _time := 0.0


func _ready() -> void:
	var model: PackedScene = load(TestRoomData.MODEL)
	var decor := model.instantiate()
	decor.name = "Decor"
	add_child(decor)
	for node_name in TestRoomData.HIDDEN_NODES:
		var hidden := decor.find_child(node_name, true, false)
		if hidden:
			hidden.queue_free()
	EgyptStyle.new().apply(decor)
	_add_collisions()
	_add_lighting()
	_add_brazier_flame()


## Limites du sol (px), pour la caméra.
func floor_rect() -> Rect2:
	return TestRoomData.FLOOR


func spawn_point() -> Vector2:
	return TestRoomData.SPAWN


func floor_height() -> float:
	return TestRoomData.FLOOR_HEIGHT


func _process(delta: float) -> void:
	# Le feu vacille doucement (comme dans la démo validée).
	_time += delta
	_fire.light_energy = 3.0 * (1.0 + 0.06 * sin(_time * 7.3) + 0.04 * sin(_time * 12.9 + 1.7))


func _add_collisions() -> void:
	var body := StaticBody3D.new()
	body.name = "Collisions"
	add_child(body)
	var f := TestRoomData.FLOOR
	var t := TestRoomData.WALL_THICKNESS
	# Quatre murs autour du sol.
	_box(body, Vector2(f.get_center().x, f.position.y - t * 0.5), Vector2(f.size.x + t * 2.0, t), 0.0)
	_box(body, Vector2(f.get_center().x, f.end.y + t * 0.5), Vector2(f.size.x + t * 2.0, t), 0.0)
	_box(body, Vector2(f.position.x - t * 0.5, f.get_center().y), Vector2(t, f.size.y), 0.0)
	_box(body, Vector2(f.end.x + t * 0.5, f.get_center().y), Vector2(t, f.size.y), 0.0)
	for o in TestRoomData.ROUND_OBSTACLES:
		var shape := CylinderShape3D.new()
		shape.radius = Units.m(o.r)
		shape.height = TestRoomData.SOLID_HEIGHT
		_add_shape(body, shape, o.at, 0.0)
	for o in TestRoomData.BOX_OBSTACLES:
		_box(body, o.at, Vector2(o.side, o.side), o.rot)


func _box(body: StaticBody3D, center: Vector2, size_px: Vector2, rot: float) -> void:
	var shape := BoxShape3D.new()
	shape.size = Vector3(Units.m(size_px.x), TestRoomData.SOLID_HEIGHT, Units.m(size_px.y))
	_add_shape(body, shape, center, rot)


func _add_shape(body: StaticBody3D, shape: Shape3D, center: Vector2, rot: float) -> void:
	var cs := CollisionShape3D.new()
	cs.shape = shape
	cs.position = Units.to_world(center, TestRoomData.SOLID_HEIGHT * 0.5)
	cs.rotation.y = rot
	body.add_child(cs)


## Lumière de l'essai validé : soleil chaud, ciel bleuté, tonalité AgX, ombres de contact douces.
func _add_lighting() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("#15110d")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("#c9d3e8")
	env.ambient_light_energy = 0.55
	env.tonemap_mode = Environment.TONE_MAPPER_AGX
	env.tonemap_exposure = 1.05
	env.glow_enabled = true
	env.glow_intensity = 0.7
	env.glow_hdr_threshold = 1.1
	env.ssao_enabled = true
	env.ssao_radius = 0.9
	env.ssao_intensity = 1.8
	env.ssil_enabled = true
	env.adjustment_enabled = true
	env.adjustment_saturation = 1.12
	env.adjustment_contrast = 1.05
	var world_env := WorldEnvironment.new()
	world_env.environment = env
	add_child(world_env)

	var sun := DirectionalLight3D.new()
	sun.name = "Soleil"
	sun.light_color = Color("#ffe6c4")
	sun.light_energy = 2.3
	sun.shadow_enabled = true
	sun.shadow_blur = 1.3
	sun.shadow_bias = 0.08
	sun.shadow_normal_bias = 2.5
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_ORTHOGONAL
	sun.directional_shadow_max_distance = 70.0
	add_child(sun)
	# Direction du soleil dans Blender (x, y, z) = (1, 0.18, -1.45), soit (1, -1.45, -0.18) dans Godot.
	sun.basis = Basis.looking_at(Vector3(1.0, -1.45, -0.18).normalized(), Vector3.UP)

	_fire = OmniLight3D.new()
	_fire.name = "Feu"
	_fire.light_color = Color("#ff9a45")
	_fire.light_energy = 3.0
	_fire.omni_range = 6.5
	# Sur téléphone, l'ombre d'une lumière ponctuelle coûte cher : on la garde pour l'ordinateur.
	_fire.shadow_enabled = RenderingServer.get_current_rendering_method() == "forward_plus"
	_fire.shadow_bias = 0.15
	_fire.shadow_normal_bias = 2.0
	_fire.position = _brazier_point(TestRoomData.FLOOR_HEIGHT + FIRE_LIGHT_HEIGHT, -0.15)
	add_child(_fire)


## Flamme du brasero (en attendant les flammes animées de l'étape « effets »).
func _add_brazier_flame() -> void:
	var y := TestRoomData.FLOOR_HEIGHT + FLAME_HEIGHT
	_flame_blob(EgyptStyle.emissive("#ff4a00", 2.6), _brazier_point(y, 0.0), Vector3(0.42, 0.75, 0.42))
	_flame_blob(EgyptStyle.emissive("#ffa020", 3.5), _brazier_point(y - 0.1, -0.07), Vector3(0.22, 0.42, 0.22))


func _flame_blob(mat: Material, pos: Vector3, scale_v: Vector3) -> void:
	var mi := MeshInstance3D.new()
	mi.mesh = SphereMesh.new()
	mi.material_override = mat
	mi.position = pos
	mi.scale = scale_v
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mi)


## Point au-dessus du brasero, décalé de `blender_dy` m en profondeur comme dans Blender
## (une valeur négative le rapproche de la caméra).
func _brazier_point(height: float, blender_dy: float) -> Vector3:
	return Units.to_world(TestRoomData.BRAZIER, height) + Vector3(0, 0, -blender_dy)
