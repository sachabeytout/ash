import Phaser from 'phaser';
import '@fontsource/marcellus/latin.css';
import '@fontsource/marcellus/latin-ext.css';
import digitsRegular from '@fontsource/philosopher/files/philosopher-latin-400-normal.woff2?url';
import digitsBold from '@fontsource/philosopher/files/philosopher-latin-700-normal.woff2?url';
import { createGameConfig } from './game/config';
import { detectLocale, setLocale } from './i18n';
import {
  lockBrowserGestures,
  onAppHidden,
  onViewportChange,
  resetPageViewport,
} from './platform/device';
import { requestPersistentStorage, setupPwa } from './platform/pwa';
import { session } from './game/session';
import { settings } from './core/settings';
import { installTextScale } from './game/textScale';
import { initRenderScale, installHighResolution } from './game/view';
import { applyLandscape, installLandscape } from './game/landscape';

session.load();
setLocale(settings.language === 'auto' ? detectLocale(navigator.languages) : settings.language);
lockBrowserGestures();
setupPwa();
void requestPersistentStorage();

applyLandscape();
installLandscape();
initRenderScale();
installHighResolution();
installTextScale();

/** La police doit être prête avant les premiers textes (sinon Phaser les dessine avec la police de secours). */
async function fontsReady(): Promise<void> {
  if (!('fonts' in document)) return;
  // Chiffres plus lisibles que ceux de Marcellus (« 1 » et « 0 » ressemblaient à « I » et « O ») : Philosopher.
  const digits = [
    new FontFace('AshDigits', `url(${digitsRegular})`, {
      unicodeRange: 'U+0030-0039',
      weight: '400',
    }),
    new FontFace('AshDigits', `url(${digitsBold})`, { unicodeRange: 'U+0030-0039', weight: '700' }),
  ];
  digits.forEach((f) => document.fonts.add(f));
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 2500));
  await Promise.race([
    Promise.all([
      document.fonts.load('16px "Marcellus"'),
      document.fonts.load('16px "Marcellus"', 'œÉ'),
    ]),
    timeout,
  ]).catch(() => undefined);
}
await fontsReady();
const game = new Phaser.Game(createGameConfig('game'));

// Après une rotation, on recadre le jeu sur l'écran réel.
onViewportChange(() => {
  applyLandscape();
  resetPageViewport();
  game.scale.refresh();
});

// Phaser met déjà la boucle en pause quand l'onglet est caché ; on enregistre par sécurité.
onAppHidden(() => {
  session.commit();
  game.events.emit('app-hidden');
});
