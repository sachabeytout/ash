class_name ReleaseGate
extends RefCounted
## Après un menu : le déplacement reste à zéro tant que le joueur n'a pas tout relâché
## (traduit de `Controls.resetAfterMenu` / `waitRelease`).

const RELEASED_BELOW := 0.1

var _waiting := false


func arm() -> void:
	_waiting = true


func is_waiting() -> bool:
	return _waiting


func filter(move: Vector2) -> Vector2:
	if not _waiting:
		return move
	if move.length() < RELEASED_BELOW:
		_waiting = false
	return Vector2.ZERO
