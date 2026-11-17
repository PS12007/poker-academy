import { defineConfig } from '@playwright/test';

/** Smoke tests against the production build served by vite preview. Run: npm run test:e2e */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:4174/', viewport: { width: 1280, height: 860 } },
  webServer: {
    command: 'npx vite preview --port 4174 --strictPort',
    url: 'http://localhost:4174/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
