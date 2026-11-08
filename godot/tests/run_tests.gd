extends SceneTree
## Lance tous les tests (sans fenêtre) :
##   godot --headless --path godot --script res://tests/run_tests.gd
## 1. Tests unitaires : chaque méthode `test_…` des fichiers tests/unit/test_*.gd.
## 2. Scénarios : le jeu tourne vraiment (physique comprise) avec des appuis simulés (tests/scenarios.gd).
## Code de sortie 0 si tout passe, 1 sinon.

const UNIT_DIR := "res://tests/unit"

var _passed := 0
var _failed := 0


func _initialize() -> void:
	_run_unit_tests()
	_run_scenarios.call_deferred()


func _run_unit_tests() -> void:
	var files := Array(DirAccess.get_files_at(UNIT_DIR))
	files.sort()
	for file: String in files:
		if not (file.begins_with("test_") and file.ends_with(".gd")):
			continue
		var script: GDScript = load(UNIT_DIR.path_join(file))
		var suite: TestSuite = script.new()
		for method in suite.get_method_list():
			var test_name: String = method.name
			if test_name.begins_with("test_"):
				suite.reset()
				suite.call(test_name)
				_report(file, test_name, suite)


func _run_scenarios() -> void:
	var scenarios: GDScript = load("res://tests/scenarios.gd")
	var runner: Node = scenarios.new()
	root.add_child(runner)
	for test_name: String in runner.call("names"):
		var suite := TestSuite.new()
		await runner.call("run", test_name, suite)
		_report("scenarios.gd", test_name, suite)
	runner.queue_free()
	print("%d tests réussis, %d en échec" % [_passed, _failed])
	quit(1 if _failed > 0 else 0)


func _report(file: String, test_name: String, suite: TestSuite) -> void:
	if suite.checks == 0:
		suite.failures.append("aucune vérification faite (erreur dans le test ?)")
	if suite.failures.is_empty():
		_passed += 1
		return
	_failed += 1
	for f in suite.failures:
		printerr("ÉCHEC %s › %s : %s" % [file, test_name, f])
