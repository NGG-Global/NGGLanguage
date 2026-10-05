import { defineConfig, devices } from '@playwright/test';

// Visual + behavioural checks at the reference size (390×844 @2x).
// `npm run test:e2e` builds two variants first: the real content and one with
// renamed languages (acceptance criterion 5).
export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: 'he-IL',
  },
  webServer: [
    { command: 'npx vite preview --port 4173 --strictPort --host 127.0.0.1', url: 'http://127.0.0.1:4173', reuseExistingServer: true },
    { command: 'npx vite preview --port 4174 --strictPort --host 127.0.0.1 --outDir dist-renamed', url: 'http://127.0.0.1:4174', reuseExistingServer: true },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } }],
});
