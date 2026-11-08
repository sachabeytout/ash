extends TestSuite
## Traduction du suivi de caméra de RunScene (startFollow 0.14, marge de 36 px).


func test_follow_matches_60_fps() -> void:
	near(CameraMath.follow_factor(1.0 / 60.0), 0.14, "à 60 images/s : 14 % par image")
	var f120 := CameraMath.follow_factor(1.0 / 120.0)
	near(1.0 - (1.0 - f120) * (1.0 - f120), 0.14, "deux images à 120 Hz = une image à 60 Hz")


func test_clamp_center() -> void:
	var half := Vector2(160, 90)
	var bounds := Rect2(0, 0, 400, 300)
	near_vec(CameraMath.clamp_center(Vector2(0, 0), half, bounds), Vector2(160, 90), "coin : bloqué aux bords")
	near_vec(CameraMath.clamp_center(Vector2(390, 290), half, bounds), Vector2(240, 210), "coin opposé")
	near_vec(CameraMath.clamp_center(Vector2(200, 150), half, bounds), Vector2(200, 150), "milieu : libre")
	var low := Rect2(0, 0, 400, 150)
	near_vec(CameraMath.clamp_center(Vector2(300, 0), half, low), Vector2(240, 75), "salle moins haute que la vue : centrée en hauteur")


func test_margin_matches_original() -> void:
	var src := FileAccess.get_file_as_string(ProjectSettings.globalize_path("res://").path_join("../src/game/scenes/RunScene.ts"))
	check(src.contains("const margin = %d;" % int(CameraMath.BOUNDS_MARGIN)), "marge de 36 px dans RunScene.setupCamera")
	check(src.contains("startFollow(this.player.sprite, true, %s, %s)" % [CameraMath.FOLLOW_LERP, CameraMath.FOLLOW_LERP]), "suivi 0.14 dans RunScene.followPlayer")
