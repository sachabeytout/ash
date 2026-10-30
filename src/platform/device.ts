/** Empêche zoom, défilement, menu contextuel et sélection pendant le jeu. */
export function lockBrowserGestures(): void {
  const prevent = (e: Event) => e.preventDefault();
  document.addEventListener('contextmenu', prevent);
  document.addEventListener('gesturestart', prevent); // pincement Safari
  document.addEventListener('dblclick', prevent);
  document.addEventListener('touchmove', prevent, { passive: false });
}

/** Demande le plein écran / l'orientation paysage quand le navigateur le permet (sans effet sur iOS). */
export async function tryLandscapeFullscreen(): Promise<void> {
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    }
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (o: string) => Promise<void>;
    };
    await orientation.lock?.('landscape');
  } catch {
    // Non supporté (iOS, desktop) : on ignore sans bruit.
  }
}

/**
 * Appelle `onChange` après une rotation ou un changement de taille d'écran.
 * iOS donne parfois des dimensions « à moitié tournées » pendant l'animation de rotation :
 * on rappelle donc plusieurs fois, jusqu'à ce que les mesures soient stables.
 */
export function onViewportChange(onChange: () => void): void {
  let timers: ReturnType<typeof setTimeout>[] = [];
  const schedule = () => {
    timers.forEach(clearTimeout);
    timers = [0, 100, 300, 700].map((ms) => setTimeout(onChange, ms));
  };
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  screen.orientation?.addEventListener?.('change', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
}

/** Annule tout zoom ou défilement que le navigateur aurait appliqué à la page. */
export function resetPageViewport(): void {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

/** Vibration courte (Android seulement : Safari iOS ne la gère pas, on ignore sans bruit). */
export function vibrate(ms: number): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // ignoré
  }
}

/** Appelle `onHide` quand l'app passe en arrière-plan (pause + sauvegarde). */
export function onAppHidden(onHide: () => void): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onHide();
  });
}
