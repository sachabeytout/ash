class_name Player
extends CharacterBody3D
## Ash dans la salle (pour l'instant : déplacement libre seulement, traduit de `Player.updateFreeMotion`).
## Le personnage est un mannequin neutre en attendant le vrai modèle 3D d'Ash.

## Hauteur de la silhouette (m) ; la collision fait la largeur d'Ash dans le jeu d'origine.
const BODY_HEIGHT := 1.4
## Le petit triangle doré qui montre la direction du regard (« pip » du jeu d'origine), à 13 px.
const PIP_DISTANCE := 13.0
const PIP_SIZE := 5.0
const PIP_COLOR := Color(1.0, 0.878, 0.541, 0.85)
## Vitesse de rotation de la silhouette vers la direction du regard (purement visuel).
const TURN_RATE := 25.0

var controls: Controls
## Vitesse dans le plan du jeu (px/s), comme dans la version d'origine.
var plane_velocity := Vector2.ZERO
## Direction du regard (angle dans le plan du jeu) ; au départ, vers le haut de l'écran.
var facing := -PI / 2.0

var _figure: Node3D
var _pip: MeshInstance3D


func _ready() -> void:
	motion_mode = CharacterBody3D.MOTION_MODE_FLOATING
	axis_lock_linear_y = true
	var shape := CollisionShape3D.new()
	var cyl := CylinderShape3D.new()
	cyl.radius = Units.m(PlayerData.RADIUS)
	cyl.height = BODY_HEIGHT
	shape.shape = cyl
	shape.position.y = BODY_HEIGHT * 0.5
	add_child(shape)
	_figure = _build_mannequin()
	add_child(_figure)
	_pip = _build_pip()
	add_child(_pip)
	_figure.rotation.y = _yaw(facing)


## Position dans le plan du jeu (px).
func plane_position() -> Vector2:
	return Units.to_plane(global_position)


func place(at: Vector2) -> void:
	var h := global_position.y
	global_position = Units.to_world(at, h)
	reset_physics_interpolation()


func _physics_process(delta: float) -> void:
	if controls == null:
		return
	plane_velocity = Motion.free_velocity(
		plane_velocity,
		controls.move,
		PlayerData.SPEED,
		PlayerData.ACCELERATION,
		PlayerData.DECELERATION,
		delta * 1000.0
	)
	facing = Motion.free_facing(
		facing,
		plane_position(),
		controls.move,
		controls.aim_dir,
		controls.has_aim_dir,
		controls.mouse_world,
		controls.has_mouse_world
	)
	velocity = Vector3(plane_velocity.x, 0.0, plane_velocity.y) / Units.PX_PER_M
	move_and_slide()


func _process(delta: float) -> void:
	_figure.rotation.y = lerp_angle(_figure.rotation.y, _yaw(facing), 1.0 - exp(-TURN_RATE * delta))
	var dir := Vector3(cos(facing), 0.0, sin(facing))
	_pip.position = dir * Units.m(PIP_DISTANCE) + Vector3(0, 0.02, 0)
	_pip.rotation.y = _yaw(facing)


## Angle du plan du jeu vers la rotation 3D (l'avant d'un objet Godot regarde vers -z).
static func _yaw(angle: float) -> float:
	return atan2(-cos(angle), -sin(angle))


func _build_mannequin() -> Node3D:
	var root := Node3D.new()
	root.name = "Mannequin"
	var neutral := StandardMaterial3D.new()
	neutral.albedo_color = Color("#cfc8bd")
	neutral.roughness = 0.6
	var body := CapsuleMesh.new()
	body.radius = 0.27
	body.height = 0.95
	_add_part(root, body, neutral, Vector3(0, 0.5, 0))
	var head := SphereMesh.new()
	head.radius = 0.25
	head.height = 0.5
	_add_part(root, head, neutral, Vector3(0, 1.13, 0))
	# Petit nez pour voir où regarde le mannequin.
	var nose := SphereMesh.new()
	nose.radius = 0.06
	nose.height = 0.12
	_add_part(root, nose, neutral, Vector3(0, 1.12, -0.24))
	return root


func _add_part(parent: Node3D, mesh: Mesh, mat: Material, pos: Vector3) -> void:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = pos
	parent.add_child(mi)


func _build_pip() -> MeshInstance3D:
	var s := Units.m(PIP_SIZE)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	# Triangle à plat sur le sol, pointe vers l'avant (-z).
	st.add_vertex(Vector3(-s * 0.5, 0, s * 0.5))
	st.add_vertex(Vector3(0, 0, -s * 0.5))
	st.add_vertex(Vector3(s * 0.5, 0, s * 0.5))
	var mat := StandardMaterial3D.new()
	mat.albedo_color = PIP_COLOR
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	mi.material_override = mat
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mi.name = "Pip"
	return mi
