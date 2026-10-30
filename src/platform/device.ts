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

/** Appelle `onHide` quand l'app passe en arrière-plan (pause + sauvegarde). */
export function onAppHidden(onHide: () => void): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onHide();
  });
}
