extends TestSuite


func test_scale() -> void:
	eq(Units.PX_PER_M, 16.0, "1 m = 16 px")
	near(Units.m(PlayerData.RADIUS * 2.0), 0.75, "largeur d'Ash en mètres")


func test_round_trip() -> void:
	var p := Vector2(-68.8, 20.0)
	var w := Units.to_world(p, 0.16)
	near(w.y, 0.16, "hauteur gardée")
	near(w.z, 1.25, "le bas de l'écran est vers la caméra (+z)")
	near_vec(Units.to_plane(w), p, "aller-retour")
