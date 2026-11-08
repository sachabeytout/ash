class_name EgyptStyle
extends RefCounted
## Matériaux de la salle égyptienne (direction « diorama miniature haut de gamme »), repris de l'essai
## Godot validé : chaque matériau du modèle Blender est remplacé par sa version Godot, choisie par son nom.

const FLOOR_TINTS: Array[String] = ["#d4a35a", "#cc9a52", "#d9ab64"]

var materials: Dictionary[String, Material] = {}
var floor_variants: Array[StandardMaterial3D] = []
var _rng := RandomNumberGenerator.new()


func _init(seed_value := 7) -> void:
	_rng.seed = seed_value
	materials = {
		"grout": _mat("#8e6236", 0.95, 0.0, 0.1),
		"wall": _mat("#e0b06c", 0.85, 0.0, 0.14, 0.35),
		"cap": _mat("#ecc88c", 0.8, 0.0, 0.1, 0.35),
		"base": _mat("#5a3f2b", 0.9, 0.0, 0.08),
		"teal": _mat("#2f8a86", 0.6, 0.0, 0.06),
		"ochre": _mat("#d1913a", 0.6, 0.0, 0.06),
		"column": _mat("#ecc78a", 0.75, 0.0, 0.1),
		"bronze": _mat("#b0803f", 0.38, 0.75, 0.06),
		"bronze_dark": _mat("#6a4b2a", 0.45, 0.6, 0.06),
		"iron": _mat("#3a3e48", 0.45, 0.5, 0.04),
		"steel": _mat("#b9c0c8", 0.3, 0.8, 0.0),
		"hole": _mat("#20160f", 0.9, 0.0, 0.0),
		"wood": _mat("#9a5e30", 0.75, 0.0, 0.18, 1.6),
		"wood_dark": _mat("#5e3a1f", 0.75, 0.0, 0.16, 1.6),
		"pot": _mat("#a9552e", 0.7, 0.0, 0.08),
		"leaf": _mat("#4f8f2e", 0.65, 0.0, 0.3, 2.5),
		"rope": _mat("#c9a066", 0.9, 0.0, 0.1),
		"coal": emissive("#ff4a10", 2.0),
		"jar": _jar_material(),
	}
	for tint in FLOOR_TINTS:
		floor_variants.append(_mat(tint, 0.85, 0.0, 0.16, 0.45))


## Remplace les matériaux du modèle (et de tous ses enfants) ; chaque dalle prend une teinte au hasard.
func apply(node: Node) -> void:
	if node is MeshInstance3D:
		var mi := node as MeshInstance3D
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
		for i in mi.mesh.get_surface_count():
			var src := mi.mesh.surface_get_material(i)
			var key := String(src.resource_name) if src else ""
			if key == "floor":
				mi.set_surface_override_material(i, floor_variants[_rng.randi_range(0, floor_variants.size() - 1)])
			elif materials.has(key):
				mi.set_surface_override_material(i, materials[key])
	for child in node.get_children():
		apply(child)


static func emissive(hex: String, energy: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color.html(hex)
	m.emission_enabled = true
	m.emission = Color.html(hex)
	m.emission_energy_multiplier = energy
	return m


## Matériau mat légèrement marbré (bruit plaqué sur les trois axes, sans dépliage UV).
func _mat(hex: String, rough: float, metal: float, mottle: float, scale := 0.5) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color.html(hex)
	m.roughness = rough
	m.metallic = metal
	if mottle > 0.0:
		m.albedo_texture = _noise(1.0 - 2.0 * mottle)
		m.uv1_triplanar = true
		m.uv1_scale = Vector3(scale, scale, scale)
	return m


func _noise(low: float) -> NoiseTexture2D:
	var n := FastNoiseLite.new()
	n.frequency = 0.03
	n.fractal_octaves = 5
	var g := Gradient.new()
	g.set_color(0, Color(low, low, low))
	g.set_color(1, Color.WHITE)
	var t := NoiseTexture2D.new()
	t.noise = n
	t.seamless = true
	t.width = 256
	t.height = 256
	t.color_ramp = g
	return t


## Jarre en terre cuite avec une bande bleue (selon la hauteur dans la jarre).
static func _jar_material() -> ShaderMaterial:
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
uniform vec4 clay : source_color = vec4(0.72, 0.38, 0.18, 1.0);
uniform vec4 band : source_color = vec4(0.18, 0.35, 0.66, 1.0);
varying float h;
void vertex() { h = VERTEX.y; }
void fragment() {
	float b = step(0.38, h) * step(h, 0.47);
	ALBEDO = mix(clay.rgb, band.rgb, b);
	ROUGHNESS = 0.45;
}
"""
	var m := ShaderMaterial.new()
	m.shader = sh
	return m
