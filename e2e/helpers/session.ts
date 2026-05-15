import { expect, type Page } from '@playwright/test';

/**
 * From the home screen, tap the new-session FAB and wait for the session
 * route to load. Returns the session id parsed from the URL.
 */
export async function createSessionFromHome(page: Page): Promise<string> {
  await page.getByTestId('home-fab').click();
  await page.waitForURL(/\/session\/[a-f0-9-]+/);
  await expect(page.getByText('No drills yet')).toBeVisible();
  const match = page.url().match(/\/session\/([a-f0-9-]+)/);
  if (!match) throw new Error(`Unexpected URL after session create: ${page.url()}`);
  return match[1];
}

/** Tap "← Sessions" to go back to the home tab. */
export async function backToHome(page: Page): Promise<void> {
  await page.getByTestId('session-back-btn').click();
  await page.waitForURL((url) => !url.pathname.startsWith('/session/'));
}

/** Tap the session-level trash icon and confirm the dialog. */
export async function deleteCurrentSession(page: Page): Promise<void> {
  await page.getByTestId('session-delete-btn').click();
  await expect(page.getByText('Delete session?')).toBeVisible();
  await page.getByTestId('confirm-ok-btn').click();
}
