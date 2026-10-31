import Phaser from 'phaser';

/**
 * Paysage d'office : sur un téléphone tenu en portrait, toute la page est tournée d'un quart de
 * tour (CSS), au lieu de demander de tourner le téléphone. Phaser mesure l'écran et les doigts dans
 * le repère de la page tournée : on corrige ses mesures (taille du conteneur, position du canvas,
 * position des pointeurs).
 */
const PORTRAIT_TOUCH = '(orientation: portrait) and (pointer: coarse)';

let rotated = false;

/** La page est-elle tournée (téléphone tenu en portrait) ? */
export function isRotated(): boolean {
  return rotated;
}

/** Tourne (ou remet droite) la page selon l'orientation actuelle. À rappeler après chaque rotation. */
export function applyLandscape(): void {
  rotated = window.matchMedia?.(PORTRAIT_TOUCH).matches ?? false;
  const body = document.body;
  body.classList.toggle('rotated', rotated);
  // Tailles en pixels (plus fiables que vh/vw sur iOS, dont les barres changent de taille).
  body.style.width = rotated ? `${window.innerHeight}px` : '';
  body.style.height = rotated ? `${window.innerWidth}px` : '';
}

/** Point de l'écran → point de la page tournée (rotation de 90° dans le sens horaire). */
function toPage(x: number, y: number): { x: number; y: number } {
  return { x: y, y: window.innerWidth - x };
}

export function installLandscape(): void {
  const scale = Phaser.Scale.ScaleManager.prototype as unknown as {
    getParentBounds: () => boolean;
    updateBounds: () => void;
    updateCenter: () => void;
    parent: HTMLElement | null;
    parentSize: Phaser.Structs.Size;
    canvas: HTMLCanvasElement | null;
    canvasBounds: Phaser.Geom.Rectangle;
  };
  const getParentBounds = scale.getParentBounds;
  scale.getParentBounds = function (this: typeof scale) {
    if (!rotated || !this.parent) return getParentBounds.call(this);
    // Le conteneur est tourné : sa boîte à l'écran a largeur et hauteur inversées.
    const rect = this.parent.getBoundingClientRect();
    if (this.parentSize.width !== rect.height || this.parentSize.height !== rect.width) {
      this.parentSize.setSize(rect.height, rect.width);
      return true;
    }
    return false;
  };
  const updateCenter = scale.updateCenter;
  scale.updateCenter = function (this: typeof scale) {
    if (!rotated || !this.canvas) {
      updateCenter.call(this);
      return;
    }
    // Centrage avec la taille du canvas dans la page tournée (et non sa boîte à l'écran).
    const r = this.canvas.getBoundingClientRect();
    const style = this.canvas.style;
    style.marginLeft = `${Math.floor((this.parentSize.width - r.height) / 2)}px`;
    style.marginTop = `${Math.floor((this.parentSize.height - r.width) / 2)}px`;
  };
  const updateBounds = scale.updateBounds;
  scale.updateBounds = function (this: typeof scale) {
    if (!rotated || !this.canvas) {
      updateBounds.call(this);
      return;
    }
    const r = this.canvas.getBoundingClientRect();
    const b = this.canvasBounds;
    b.x = r.top;
    b.y = window.innerWidth - r.right;
    b.width = r.height;
    b.height = r.width;
  };

  const input = Phaser.Input.InputManager.prototype as unknown as {
    transformPointer: (pointer: unknown, pageX: number, pageY: number, wasMove: boolean) => void;
  };
  const transformPointer = input.transformPointer;
  input.transformPointer = function (this: unknown, pointer, pageX, pageY, wasMove) {
    if (!rotated) {
      transformPointer.call(this, pointer, pageX, pageY, wasMove);
      return;
    }
    const p = toPage(pageX, pageY);
    transformPointer.call(this, pointer, p.x, p.y, wasMove);
  };
}
