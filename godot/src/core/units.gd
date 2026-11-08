class_name Units
extends RefCounted
## Passage du plan du jeu d'origine (pixels logiques, x vers la droite, y vers le bas de l'écran)
## à la 3D de Godot (mètres, x vers la droite, y vers le haut, z vers la caméra).
##
## Les règles du jeu (vitesses, distances, tailles) sont traduites telles quelles, en pixels :
## les tests peuvent ainsi les comparer une à une avec la version d'origine.

## 1 mètre = 16 pixels logiques : Ash (rayon 6 px) fait 0,75 m de large, une dalle du sol 1 m.
const PX_PER_M := 16.0


## Point du plan du jeu (px) vers la 3D (m), à la hauteur `height` (m).
static func to_world(p: Vector2, height := 0.0) -> Vector3:
	return Vector3(p.x / PX_PER_M, height, p.y / PX_PER_M)


## Point 3D (m) vers le plan du jeu (px) ; la hauteur est ignorée.
static func to_plane(v: Vector3) -> Vector2:
	return Vector2(v.x, v.z) * PX_PER_M


## Longueur ou vitesse : pixels vers mètres.
static func m(px: float) -> float:
	return px / PX_PER_M
