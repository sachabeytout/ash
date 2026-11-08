class_name TestSuite
extends RefCounted
## Base des tests : chaque méthode `test_…` d'un fichier `tests/unit/test_*.gd` est un test.

const EPSILON := 0.0001

var failures: Array[String] = []
var checks := 0


func reset() -> void:
	failures.clear()
	checks = 0


func check(ok: bool, message: String) -> void:
	checks += 1
	if not ok:
		failures.append(message)


func eq(actual: Variant, expected: Variant, what := "") -> void:
	check(actual == expected, "%s : obtenu %s, attendu %s" % [what, actual, expected])


func near(actual: float, expected: float, what := "", tolerance := EPSILON) -> void:
	check(absf(actual - expected) <= tolerance, "%s : obtenu %s, attendu %s (± %s)" % [what, actual, expected, tolerance])


func near_vec(actual: Vector2, expected: Vector2, what := "", tolerance := EPSILON) -> void:
	check(actual.distance_to(expected) <= tolerance, "%s : obtenu %s, attendu %s (± %s)" % [what, actual, expected, tolerance])


## Valeur numérique lue dans un fichier de la version d'origine (dossier src/ du dépôt), pour
## vérifier que la traduction garde exactement les mêmes réglages. `path` : par exemple
## ["dash", "distance"] pour `dash: { distance: 64 }`.
static func original_number(file: String, path: Array[String]) -> float:
	var full := ProjectSettings.globalize_path("res://").path_join("../src").path_join(file)
	var text := FileAccess.get_file_as_string(full)
	if text.is_empty():
		return NAN
	var from := 0
	for i in path.size():
		var re := RegEx.new()
		var last := i == path.size() - 1
		re.compile("\\b" + path[i] + (":\\s*(-?[0-9.]+)(\\s*/\\s*([0-9.]+))?" if last else ":\\s*\\{"))
		var m := re.search(text, from)
		if m == null:
			return NAN
		if last:
			var value := float(m.get_string(1))
			return value / float(m.get_string(3)) if m.get_string(3) != "" else value
		from = m.get_end()
	return NAN
