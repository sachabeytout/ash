import Phaser from 'phaser';
import { createGameConfig } from './game/config';
import { detectLocale, setLocale } from './i18n';
import { lockBrowserGestures, onAppHidden } from './platform/device';
import { requestPersistentStorage, setupPwa } from './platform/pwa';

setLocale(detectLocale(navigator.languages));
lockBrowserGestures();
setupPwa();
void requestPersistentStorage();

const game = new Phaser.Game(createGameConfig('game'));

// Phaser met déjà la boucle en pause quand l'onglet est caché ; la sauvegarde viendra s'y brancher en M1.
onAppHidden(() => game.events.emit('app-hidden'));
