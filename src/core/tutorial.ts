/**
 * Premier essai guidé : pendant la toute première run, de petites bulles montrent les gestes au bon
 * moment (bouger, attaquer, esquiver, attaque puissante, Super, portes). Chaque bulle disparaît dès
 * que le geste est fait. Une seule fois (identifiant rangé avec les dialogues vus), et on peut passer.
 */
export const TUTORIAL_ID = 'tutorial_done';

export type TutorialStep = 'move' | 'attack' | 'dash' | 'power' | 'super' | 'doors';
export type TutorialEvent =
  | { type: 'moved'; distance: number }
  | { type: 'attack' | 'power' | 'dash' | 'super' | 'superReady' | 'roomCleared' | 'doorTaken' };

/** Distance à parcourir avant de passer à la suite (en pixels de jeu). */
export const TUTORIAL_MOVE_DISTANCE = 60;

/** Les gestes de base, dans l'ordre. */
const BASICS: readonly TutorialStep[] = ['move', 'attack', 'dash', 'power'];

export interface TutorialState {
  /** La bulle affichée (null : rien pour l'instant). */
  step: TutorialStep | null;
  /** Prochain geste de base à montrer (null : tous faits). */
  basic: TutorialStep | null;
  moved: number;
  superDone: boolean;
  doorsDone: boolean;
}

export function newTutorial(): TutorialState {
  return { step: 'move', basic: 'move', moved: 0, superDone: false, doorsDone: false };
}

/** Tout a été montré : le guide peut s'arrêter. */
export function tutorialDone(s: TutorialState): boolean {
  return s.basic === null && s.superDone && s.doorsDone && s.step === null;
}

function nextBasic(step: TutorialStep): TutorialStep | null {
  const i = BASICS.indexOf(step);
  return BASICS[i + 1] ?? null;
}

/** Fait avancer le guide. Renvoie vrai si la bulle affichée a changé. */
export function stepTutorial(s: TutorialState, e: TutorialEvent): boolean {
  const before = s.step;
  switch (e.type) {
    case 'moved':
      if (s.basic === 'move') {
        s.moved += e.distance;
        if (s.moved >= TUTORIAL_MOVE_DISTANCE) s.basic = nextBasic('move');
      }
      break;
    case 'attack':
    case 'dash':
    case 'power':
      if (s.basic === e.type) s.basic = nextBasic(e.type);
      break;
    case 'super':
      s.superDone = true;
      break;
    case 'superReady':
      break;
    case 'roomCleared':
      break;
    case 'doorTaken':
      if (s.step === 'doors') s.doorsDone = true;
      break;
  }
  // Ce qu'on montre maintenant : les portes et le Super passent avant les gestes de base restants.
  if (e.type === 'roomCleared' && !s.doorsDone) s.step = 'doors';
  else if (e.type === 'superReady' && !s.superDone && s.step !== 'doors') s.step = 'super';
  else if (s.step === 'super' && s.superDone) s.step = s.basic;
  else if (s.step === 'doors' && s.doorsDone) s.step = s.basic;
  else if (s.step !== 'super' && s.step !== 'doors') s.step = s.basic;
  return s.step !== before;
}
