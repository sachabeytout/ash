import { defineConfig, devices } from '@playwright/test';

// Le smoke test tourne sur le build de production (comme en ligne), sous le même sous-chemin.
const baseURL = `http://localhost:4173${process.env.BASE_PATH ?? '/'}`;

export default defineConfig({
  testDir: 'tests/e2e',
  // Rendu à la résolution de l'écran : plus lent sans carte graphique (CI), d'où la marge.
  timeout: 120_000,
  // Un test à la fois : deux rendus en parallèle sans carte graphique ralentissent trop le jeu.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    serviceWorkers: 'block',
    locale: 'fr-FR',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    {
      // Téléphone en paysage (écran type iPhone 15) rendu par Chromium mobile.
      name: 'mobile-paysage',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 852, height: 393 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
