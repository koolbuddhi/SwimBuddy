import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — runs the same spec files against two targets:
 *
 *   • local      — drives a wrangler dev API + Expo dev server. The
 *                  `/auth/test-signin` backdoor is enabled here so tests
 *                  don't need a real Google account. Used in CI and on
 *                  the developer's laptop.
 *
 *   • prod-smoke — drives https://swimbuddy.pages.dev. The backdoor is
 *                  disabled in production so this profile only runs a
 *                  small subset of "is the deploy alive" tests. Spec
 *                  files opt in by tagging with @smoke.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'en-US',
    timezoneId: 'Asia/Colombo',
  },

  projects: [
    {
      name: 'local',
      testIgnore: ['**/prod-smoke.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.LOCAL_APP_URL ?? 'http://localhost:8081',
      },
    },
    {
      name: 'prod-smoke',
      grep: /@smoke/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.PROD_APP_URL ?? 'https://swimbuddy.pages.dev',
      },
    },
  ],
});
