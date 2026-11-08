extends TestSuite
## Traduction de src/core/geometry.ts et de la fonction `approach` de Player.ts.


func test_normalize() -> void:
	near_vec(Geometry.normalize(Vector2(3, 4)), Vector2(0.6, 0.8), "vecteur 3-4")
	eq(Geometry.normalize(Vector2.ZERO), Vector2.ZERO, "vecteur nul")


func test_approach() -> void:
	near(Geometry.approach(0.0, 10.0, 3.0), 3.0, "monte d'un pas")
	near(Geometry.approach(9.0, 10.0, 3.0), 10.0, "ne dépasse pas en montant")
	near(Geometry.approach(10.0, 0.0, 4.0), 6.0, "descend d'un pas")
	near(Geometry.approach(1.0, 0.0, 4.0), 0.0, "ne dépasse pas en descendant")


func test_angle_delta() -> void:
	near(Geometry.angle_delta(0.1, -0.1), 0.2, "petit écart")
	near(Geometry.angle_delta(PI - 0.1, -PI + 0.1), 0.2, "autour de ±π")
	near(Geometry.angle_delta(0.0, 3.0 * TAU + 0.5), 0.5, "plusieurs tours")
