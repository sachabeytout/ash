class_name TestRoomData
extends RefCounted
## Salle d'essai égyptienne (modèle 3D fait dans Blender : tools/blender/egypt_test_room.py).
## Positions dans le plan du jeu, en px (1 m = 16 px). Dans Blender, un point (x, y) du sol
## devient (16 x, -16 y) ici.

const MODEL := "res://assets/rooms/egypt_test_room.glb"
## Dessus des dalles du sol (m).
const FLOOR_HEIGHT := 0.16
## Sol où l'on marche : 13 × 8 dalles d'un mètre.
const FLOOR := Rect2(-104, -64, 208, 128)
## Apparition d'Ash : en bas au centre de la salle.
const SPAWN := Vector2(0, 34)
## Brasero du fond (sa flamme et sa lumière sont ajoutées dans Godot).
const BRAZIER := Vector2(0, -55.2)
## Épaisseur des murs de collision autour du sol (px).
const WALL_THICKNESS := 32.0
## Hauteur des collisions (m) : bien plus haut qu'Ash.
const SOLID_HEIGHT := 3.0

## Obstacles ronds : centre (px) et rayon (px).
const ROUND_OBSTACLES: Array[Dictionary] = [
	{name = "colonne gauche", at = Vector2(-60.8, -48.8), r = 8.4},
	{name = "colonne droite", at = Vector2(60.8, -48.8), r = 8.4},
	{name = "brasero", at = BRAZIER, r = 7.2},
	{name = "plante haut gauche", at = Vector2(-92.8, -52.8), r = 6.4},
	{name = "plante haut droite", at = Vector2(92.8, -52.8), r = 6.4},
	{name = "plante bas gauche", at = Vector2(-92.8, 52), r = 6.4},
	{name = "plante bas droite", at = Vector2(92.8, 52), r = 6.4},
	{name = "jarre", at = Vector2(-68.8, -14.4), r = 5.8},
	{name = "jarre", at = Vector2(-41.6, -30.4), r = 5.8},
	{name = "jarre cassée", at = Vector2(-19.2, -19.2), r = 5.8},
]
## Obstacles carrés : centre (px), côté (px), rotation (radians, comme dans Blender).
const BOX_OBSTACLES: Array[Dictionary] = [
	{name = "caisse", at = Vector2(54.4, -25.6), side = 13.6, rot = 0.15},
]
## Objets du modèle retirés pour l'instant (ils n'ont pas encore de rôle dans le jeu).
const HIDDEN_NODES: Array[String] = ["bomb_root"]
