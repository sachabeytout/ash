class_name InputBuffer
extends RefCounted
## Mémoire des appuis (« input buffer ») : un appui fait un peu trop tôt n'est pas perdu,
## il reste valable pendant `window_ms` et se déclenche dès que l'action devient possible.
## Traduit de src/core/input/buffer.ts.

var _window_ms: float
var _pressed_at: Dictionary[StringName, float] = {}


func _init(window_ms: float) -> void:
	_window_ms = window_ms


func press(action: StringName, now_ms: float) -> void:
	_pressed_at[action] = now_ms


## Vrai si l'action a été appuyée récemment ; l'appui est alors consommé.
func consume(action: StringName, now_ms: float) -> bool:
	if not _pressed_at.has(action):
		return false
	var at: float = _pressed_at[action]
	_pressed_at.erase(action)
	return now_ms - at <= _window_ms


## Regarde sans consommer.
func peek(action: StringName, now_ms: float) -> bool:
	return _pressed_at.has(action) and now_ms - _pressed_at[action] <= _window_ms


func clear() -> void:
	_pressed_at.clear()
