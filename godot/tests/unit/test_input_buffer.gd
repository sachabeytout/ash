extends TestSuite
## Traduction de src/core/input/buffer.ts.


func test_consume_within_window() -> void:
	var b := InputBuffer.new(130.0)
	b.press(&"dash", 1000.0)
	check(b.consume(&"dash", 1130.0), "appui encore valable à 130 ms")
	check(not b.consume(&"dash", 1131.0), "appui déjà consommé")


func test_too_late() -> void:
	var b := InputBuffer.new(130.0)
	b.press(&"attack", 1000.0)
	check(not b.consume(&"attack", 1131.0), "appui périmé après 130 ms")


func test_peek_and_clear() -> void:
	var b := InputBuffer.new(130.0)
	b.press(&"power", 0.0)
	check(b.peek(&"power", 50.0), "visible sans consommer")
	check(b.peek(&"power", 60.0), "toujours là après un coup d'œil")
	b.clear()
	check(not b.consume(&"power", 70.0), "oublié après clear")


func test_window_matches_original() -> void:
	near(PlayerData.INPUT_BUFFER_MS, TestSuite.original_number("data/player.ts", ["inputBufferMs"]), "mémoire des appuis")
