import Phaser from 'phaser';
import { createGameConfig } from './game/config';
import { detectLocale, setLocale, t } from './i18n';
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

session.load();
setLocale(settings.language === 'auto' ? detectLocale(navigator.languages) : settings.language);
const rotateText = document.getElementById('rotate-text');
if (rotateText) rotateText.textContent = t('device.rotate');
lockBrowserGestures();
setupPwa();
void requestPersistentStorage();

initRenderScale();
installHighResolution();
installTextScale();
const game = new Phaser.Game(createGameConfig('game'));

// Après une rotation, on recadre le jeu sur l'écran réel.
onViewportChange(() => {
  resetPageViewport();
  game.scale.refresh();
});

// Phaser met déjà la boucle en pause quand l'onglet est caché ; on enregistre par sécurité.
onAppHidden(() => {
  session.commit();
  game.events.emit('app-hidden');
});
