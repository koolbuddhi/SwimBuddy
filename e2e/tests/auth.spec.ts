import { test, expect } from '@playwright/test';
import { clearLocalDB, signInTestUser, userFor } from '../fixtures/sign-in';

test.describe('Auth', () => {
  test.beforeEach(async ({ page }) => {
    await clearLocalDB(page);
  });


  test('unauthenticated user is redirected to /auth', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/\/auth/);
    await expect(page.getByText('SwimBuddy')).toBeVisible();
    await expect(page.getByText('Log your swim sessions')).toBeVisible();
  });

  test('test-signin populates the home screen and respects AuthGate', async ({ context, page }, testInfo) => {
    await signInTestUser(context, page, userFor(testInfo));
    await page.waitForURL(/^[^?#]*\/(?:\?.*)?$/); // root, no /auth
    await expect(page.getByTestId('home-fab')).toBeVisible();
  });

  test('sign out clears local user and returns to /auth', async ({ context, page }, testInfo) => {
    await signInTestUser(context, page, userFor(testInfo));
    await page.getByRole('tab', { name: /Settings/ }).click();
    await page.getByTestId('settings-signout-btn').click();
    await page.waitForURL(/\/auth/);
    await expect(page.getByText('Log your swim sessions')).toBeVisible();
  });

  test('Worker /health responds @smoke', async ({ request }) => {
    const apiBase = process.env.API_BASE ?? 'http://localhost:8787';
    const res = await request.get(`${apiBase}/health`);
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
