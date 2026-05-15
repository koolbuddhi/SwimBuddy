import { test, expect } from '@playwright/test';
import { clearLocalDB, signInTestUser, userFor } from '../fixtures/sign-in';
import { addDrill } from '../helpers/drill';
import { createSessionFromHome } from '../helpers/session';

test.describe('Export', () => {
  test.beforeEach(async ({ context, page }, testInfo) => {
    await clearLocalDB(page);
    await signInTestUser(context, page, userFor(testInfo));
  });

  test('per-session Excel export downloads a .xlsx file', async ({ page }) => {
    await createSessionFromHome(page);
    await addDrill(page, { stroke: 'fly', distanceM: 25, timeDigits: '3045' });

    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 });
    await page.getByTestId('session-export-btn').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^swimbuddy_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  test('Settings: Export last 10 days alerts when nothing recent', async ({ page }) => {
    // No sessions yet — the button should show a "no recent sessions" alert
    // and NOT trigger a download.
    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('tab', { name: /Settings/ }).click();

    let downloaded = false;
    page.on('download', () => { downloaded = true; });
    await page.getByTestId('export-excel-btn').click();
    // Give the page time to fire the alert / not download
    await page.waitForTimeout(500);
    expect(downloaded).toBe(false);
  });

  test('Settings: Export last 10 days downloads .xlsx when sessions exist', async ({ page }) => {
    await createSessionFromHome(page);
    await addDrill(page, { stroke: 'free', distanceM: 50, timeDigits: '4000' });

    await page.getByRole('tab', { name: /Settings/ }).click();
    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 });
    await page.getByTestId('export-excel-btn').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('swimbuddy_last10days.xlsx');
  });
});
