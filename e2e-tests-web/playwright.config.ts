import { defineConfig, devices } from '@playwright/test'

const webUrl = process.env['EMAILMANAGER_WEB_URL'] ?? 'http://localhost:5180'

/**
 * Playwright starts both servers itself, in test mode:
 *   - emailmanager-core with NODE_ENV=test and EMAIL_PROVIDER=fake against the test Postgres (5451),
 *     which enables the test-only sign-in route and never talks to Google (D19, TR-10)
 *   - the Vite dev server on 5180, proxying /api to the backend
 *
 * Stop any `pnpm serve:backend` / `pnpm serve:web` you have running first: the ports are the same,
 * and a dev-mode backend has no test sign-in route.
 */
export default defineConfig({
  testDir: './src',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: webUrl,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter @emailmanager/emailmanager-core serve:e2e',
      url: 'http://127.0.0.1:3601/emailmanager-core/session',
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', LOG_LEVEL: 'warn' },
    },
    {
      command: 'pnpm --filter @emailmanager/emailmanager-web dev',
      url: webUrl,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
