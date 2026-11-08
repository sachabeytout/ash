class_name MoveInput
extends RefCounted
## Règles du déplacement demandé par le joueur (traduites de Controls.ts et TouchControls.ts) :
## clavier, manette et joystick tactile donnent un seul vecteur de déplacement.

## Zone morte du stick gauche de la manette.
const PAD_DEADZONE := 0.22
## Au-delà de cette inclinaison, le stick droit vise.
const PAD_AIM_THRESHOLD := 0.45
## Joystick tactile : rayon (px de l'interface 640 × 360) et zone morte (fraction du rayon).
const JOY_RADIUS := 30.0
const JOY_DEADZONE := 0.12
## Fraction du rayon (après la zone morte) qui suffit pour la pleine vitesse.
const JOY_FULL_SPAN := 0.6


## Priorité : joystick tactile, sinon manette (hors zone morte), sinon clavier (normalisé).
static func combine(keys: Vector2, pad: Vector2, touch: Vector2) -> Vector2:
	var move := Geometry.normalize(keys)
	if pad.length() > PAD_DEADZONE:
		move = pad
	if touch.length() > 0.0:
		move = touch
	return move


## Vecteur du joystick tactile pour un doigt décalé de `offset` depuis son centre.
## Au-delà de la zone morte, on atteint vite la pleine vitesse (le pouce n'a pas besoin d'aller au bord).
static func joystick(offset: Vector2) -> Vector2:
	var dist := offset.length()
	if dist <= 0.0:
		return Vector2.ZERO
	var amount := minf(dist, JOY_RADIUS) / JOY_RADIUS
	var strength := 0.0 if amount < JOY_DEADZONE else minf(1.0, (amount - JOY_DEADZONE) / JOY_FULL_SPAN)
	return offset / dist * strength


## Position du bouton du joystick : le doigt, sans dépasser le bord du cercle.
static func knob_offset(offset: Vector2) -> Vector2:
	var dist := offset.length()
	return offset if dist <= JOY_RADIUS else offset / dist * JOY_RADIUS
