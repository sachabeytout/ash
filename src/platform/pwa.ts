import { registerSW } from 'virtual:pwa-register';
import { t } from '../i18n';

function showToast(text: string, onTap?: () => void, autoHideMs?: number): void {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = text;
  toast.style.display = 'block';
  toast.onclick = () => {
    toast.style.display = 'none';
    onTap?.();
  };
  if (autoHideMs) setTimeout(() => (toast.style.display = 'none'), autoHideMs);
}

/** Service worker : jeu hors ligne + bandeau « Nouvelle version disponible ». */
export function setupPwa(): void {
  const updateSW = registerSW({
    onNeedRefresh() {
      showToast(t('pwa.updateReady'), () => void updateSW(true));
    },
    onOfflineReady() {
      showToast(t('pwa.offlineReady'), undefined, 4000);
    },
  });
}

/** Demande au navigateur de ne pas effacer nos données (sauvegardes). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (await navigator.storage?.persisted?.()) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
