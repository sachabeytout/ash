extends TestSuite
## Traduction de `Player.updateFreeMotion` et réglages de src/data/player.ts.

const FRAME_MS := 1000.0 / 60.0


func _step(v: Vector2, move: Vector2) -> Vector2:
	return Motion.free_velocity(v, move, PlayerData.SPEED, PlayerData.ACCELERATION, PlayerData.DECELERATION, FRAME_MS)


func test_values_match_original() -> void:
	near(PlayerData.SPEED, TestSuite.original_number("data/player.ts", ["speed"]), "vitesse")
	near(PlayerData.ACCELERATION, TestSuite.original_number("data/player.ts", ["acceleration"]), "accélération")
	near(PlayerData.DECELERATION, TestSuite.original_number("data/player.ts", ["deceleration"]), "freinage")
	near(PlayerData.RADIUS, TestSuite.original_number("data/player.ts", ["radius"]), "rayon")
	near(float(PlayerData.MAX_HP), TestSuite.original_number("data/player.ts", ["maxHp"]), "vie")
	near(PlayerData.DASH.distance, TestSuite.original_number("data/player.ts", ["dash", "distance"]), "dash : distance")
	near(PlayerData.DASH.duration_ms, TestSuite.original_number("data/player.ts", ["dash", "durationMs"]), "dash : durée")
	near(PlayerData.DASH.iframes_ms, TestSuite.original_number("data/player.ts", ["dash", "iframesMs"]), "dash : invincibilité")
	near(PlayerData.DASH.cooldown_ms, TestSuite.original_number("data/player.ts", ["dash", "cooldownMs"]), "dash : recharge")
	near(PlayerData.HURT_IFRAMES_MS, TestSuite.original_number("data/player.ts", ["hurtIframesMs"]), "invincibilité après un coup")
	near(PlayerData.HURT_KNOCKBACK, TestSuite.original_number("data/player.ts", ["hurtKnockback"]), "recul")
	near(PlayerData.SUPER_GAUGE.per_damage_dealt, TestSuite.original_number("data/player.ts", ["superGauge", "perDamageDealt"]), "jauge : coups donnés")
	near(PlayerData.SUPER_GAUGE.per_damage_taken, TestSuite.original_number("data/player.ts", ["superGauge", "perDamageTaken"]), "jauge : coups reçus")
	near(PlayerData.AIM_ASSIST.near.cone_deg, TestSuite.original_number("data/player.ts", ["near", "coneDeg"]), "visée proche : cône")
	near(PlayerData.AIM_ASSIST.near.range, TestSuite.original_number("data/player.ts", ["near", "range"]), "visée proche : portée")
	near(PlayerData.AIM_ASSIST.far.cone_deg, TestSuite.original_number("data/player.ts", ["far", "coneDeg"]), "visée lointaine : cône")
	near(PlayerData.AIM_ASSIST.far.range, TestSuite.original_number("data/player.ts", ["far", "range"]), "visée lointaine : portée")
	near(PlayerData.SUPER_AIM_RANGE, TestSuite.original_number("data/player.ts", ["superAimRange"]), "visée du Super")
	near(PlayerData.GRAPPLE.cone_deg, TestSuite.original_number("data/player.ts", ["grapple", "coneDeg"]), "grappin : cône")
	near(PlayerData.GRAPPLE.turn_deg_per_sec, TestSuite.original_number("data/player.ts", ["grapple", "turnDegPerSec"]), "grappin : virage")
	near(PlayerData.GRAPPLE.travel_mul, TestSuite.original_number("data/player.ts", ["grapple", "travelMul"]), "grappin : course")
	near(PlayerData.GRAPPLE.stun_ms, TestSuite.original_number("data/player.ts", ["grapple", "stunMs"]), "grappin : immobilisation")


func test_accelerates_to_full_speed() -> void:
	var v := _step(Vector2.ZERO, Vector2(1, 0))
	near(v.x, PlayerData.ACCELERATION / 60.0, "première image : 1600 px/s² × 1/60 s", 0.001)
	for i in 5:
		v = _step(v, Vector2(1, 0))
	near(v.x, PlayerData.SPEED, "pleine vitesse en moins de 0,1 s")


func test_brakes_to_stop() -> void:
	var v := Vector2(PlayerData.SPEED, 0)
	v = _step(v, Vector2.ZERO)
	near(v.x, PlayerData.SPEED - PlayerData.DECELERATION / 60.0, "freine à 2400 px/s²", 0.001)
	for i in 2:
		v = _step(v, Vector2.ZERO)
	eq(v, Vector2.ZERO, "arrêt complet en 3 images")


func test_turning_uses_acceleration() -> void:
	# Comme dans la version d'origine : tant qu'on tient une direction, les deux axes changent
	# au rythme de l'accélération (le freinage ne sert que quand on lâche tout).
	var v := _step(Vector2(PlayerData.SPEED, 0), Vector2(0, 1))
	near(v.x, PlayerData.SPEED - PlayerData.ACCELERATION / 60.0, "x ralentit à 1600 px/s²", 0.001)
	near(v.y, PlayerData.ACCELERATION / 60.0, "y accélère", 0.001)


func test_facing_priorities() -> void:
	var origin := Vector2(10, 10)
	near(Motion.free_facing(1.0, origin, Vector2(1, 0), Vector2(0, 1), true, Vector2(10, 0), true), -PI / 2.0, "la souris d'abord")
	near(Motion.free_facing(1.0, origin, Vector2(1, 0), Vector2(0, 1), true, Vector2.ZERO, false), PI / 2.0, "puis le stick droit")
	near(Motion.free_facing(1.0, origin, Vector2(-1, 0), Vector2.ZERO, false, Vector2.ZERO, false), PI, "puis la marche")
	near(Motion.free_facing(1.0, origin, Vector2.ZERO, Vector2.ZERO, false, Vector2.ZERO, false), 1.0, "sinon inchangé")
