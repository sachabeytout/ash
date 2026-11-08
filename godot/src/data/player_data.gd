class_name PlayerData
extends RefCounted
## Caractéristiques de base d'Ash (avant dons et compétences), traduites de src/data/player.ts.
## Unités du jeu d'origine : pixels logiques et millisecondes (1 m = 16 px, voir Units).

const MAX_HP := 50
const RADIUS := 6.0
## Vitesse de déplacement (px/s) et inertie (px/s²).
const SPEED := 112.0
const ACCELERATION := 1600.0
const DECELERATION := 2400.0
const DASH := {
	distance = 64.0,
	duration_ms = 150.0,
	## Invincibilité, un peu plus longue que le dash lui-même (généreux).
	iframes_ms = 190.0,
	cooldown_ms = 320.0,
}
## Invincibilité après un coup reçu.
const HURT_IFRAMES_MS := 900.0
const HURT_KNOCKBACK := 120.0
## Mémoire des appuis (ms).
const INPUT_BUFFER_MS := 130.0
## Jauge de Super : elle se remplit en frappant et (plus vite) en étant touché.
const SUPER_GAUGE := {per_damage_dealt = 1.0 / 240.0, per_damage_taken = 1.0 / 45.0}
## Visée automatique légère des attaques (pas du dash) : un ennemi tout proche est visé même un peu
## de côté (`near`), un ennemi plus loin seulement s'il est à peu près devant (`far`).
const AIM_ASSIST := {
	near = {cone_deg = 150.0, range = 70.0},
	far = {cone_deg = 70.0, range = 140.0},
}
## Super : visée automatique sur l'ennemi le plus proche dans ce rayon, quelle que soit la direction.
const SUPER_AIM_RANGE := 260.0
## Grappin de la Chaîne du pressoir : cône de visée, virage maximal, course allongée, immobilisation.
const GRAPPLE := {cone_deg = 120.0, turn_deg_per_sec = 540.0, travel_mul = 1.5, stun_ms = 2000.0}
