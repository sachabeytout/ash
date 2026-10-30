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

setLocale(detectLocale(navigator.languages));
const rotateText = document.getElementById('rotate-text');
if (rotateText) rotateText.textContent = t('device.rotate');
lockBrowserGestures();
setupPwa();
void requestPersistentStorage();

const game = new Phaser.Game(createGameConfig('game'));

// Après une rotation, on recadre le jeu sur l'écran réel.
onViewportChange(() => {
  resetPageViewport();
  game.scale.refresh();
});

// Phaser met déjà la boucle en pause quand l'onglet est caché ; la sauvegarde viendra s'y brancher en M1.
onAppHidden(() => game.events.emit('app-hidden'));
