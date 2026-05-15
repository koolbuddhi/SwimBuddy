import { test, expect } from '@playwright/test';
import { clearLocalDB, signInTestUser, userFor } from '../fixtures/sign-in';
import { addDrill, deleteDrill, editDrill } from '../helpers/drill';
import { backToHome, createSessionFromHome } from '../helpers/session';

test.describe('Drill CRUD', () => {
  test.beforeEach(async ({ context, page }, testInfo) => {
    await clearLocalDB(page);
    await signInTestUser(context, page, userFor(testInfo));
  });

  test('create session → no drills yet', async ({ page }) => {
    await createSessionFromHome(page);
    await expect(page.getByText('No drills yet')).toBeVisible();
  });

  test('add a sub-minute drill', async ({ page }) => {
    await createSessionFromHome(page);
    await addDrill(page, { stroke: 'fly', distanceM: 25, timeDigits: '3045' });
    await expect(page.getByText('25M Butterfly')).toBeVisible();
    await expect(page.getByText('00:30.45')).toBeVisible();
  });

  test('add a 1:30 drill — digit-input crosses the 1-minute boundary (regression)', async ({ page }) => {
    // Old broken code stored parseInt('013000') = 13000cs (2:10.00).
    // New digToCs maps "013000" → 9000cs → "01:30.00".
    await createSessionFromHome(page);
    await addDrill(page, { stroke: 'back', distanceM: 50, timeDigits: '013000', label: 'easy' });
    await expect(page.getByText('50M Backstroke')).toBeVisible();
    await expect(page.getByText('01:30.00')).toBeVisible();
  });

  test('edit drill — change stroke and time', async ({ page }) => {
    await createSessionFromHome(page);
    await addDrill(page, { stroke: 'free', distanceM: 25, timeDigits: '2000' });
    await expect(page.getByText('25M Freestyle')).toBeVisible();
    await editDrill(page, 0, { stroke: 'breast', timeDigits: '2500' });
    await expect(page.getByText('25M Breaststroke')).toBeVisible();
    await expect(page.getByText('00:25.00')).toBeVisible();
    await expect(page.getByText('25M Freestyle')).not.toBeVisible();
  });

  test('delete drill — confirm path removes it', async ({ page }) => {
    await createSessionFromHome(page);
    await addDrill(page, { stroke: 'fly', distanceM: 25, timeDigits: '3000' });
    await addDrill(page, { stroke: 'back', distanceM: 25, timeDigits: '3200' });
    await expect(page.getByText('25M Butterfly')).toBeVisible();
    await deleteDrill(page, 0);
    await expect(page.getByText('25M Butterfly')).not.toBeVisible();
    await expect(page.getByText('25M Backstroke')).toBeVisible();
  });

  test('delete drill — cancel path keeps it', async ({ page }) => {
    await createSessionFromHome(page);
    await addDrill(page, { stroke: 'fly', distanceM: 25, timeDigits: '3000' });
    await page.getByTestId('drill-delete-btn').first().click();
    await expect(page.getByText('Delete drill?')).toBeVisible();
    await page.getByTestId('confirm-cancel-btn').click();
    await expect(page.getByText('Delete drill?')).not.toBeVisible();
    await expect(page.getByText('25M Butterfly')).toBeVisible();
  });

  test('edit session date — list re-sorts on home', async ({ page }) => {
    await createSessionFromHome(page);
    await addDrill(page, { stroke: 'fly', distanceM: 25, timeDigits: '3000' });
    await page.getByTestId('session-date-btn').click();
    await page.getByTestId('date-edit-input').fill('2026-01-15');
    await page.getByTestId('date-edit-save').click();
    await expect(page.getByText('Thu, Jan 15')).toBeVisible();
    await backToHome(page);
    await expect(page.getByText('Thu, Jan 15')).toBeVisible();
  });
});
