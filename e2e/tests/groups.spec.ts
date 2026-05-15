import { test, expect } from '@playwright/test';
import { clearLocalDB, signInTestUser, userFor } from '../fixtures/sign-in';
import { addDrill, deleteDrill, toggleSelectDrill } from '../helpers/drill';
import { createSessionFromHome } from '../helpers/session';

test.describe('Groups', () => {
  test.beforeEach(async ({ context, page }, testInfo) => {
    await clearLocalDB(page);
    await signInTestUser(context, page, userFor(testInfo));
  });

  async function seedTwoDrills(page: Parameters<typeof addDrill>[0]) {
    await createSessionFromHome(page);
    // 30s and 35s → sum 01:05.00
    await addDrill(page, { stroke: 'fly', distanceM: 25, timeDigits: '3000' });
    await addDrill(page, { stroke: 'back', distanceM: 25, timeDigits: '3500' });
  }

  test('selecting 2 drills shows SelectionBar with correct sum', async ({ page }) => {
    await seedTwoDrills(page);
    await toggleSelectDrill(page, 0);
    await toggleSelectDrill(page, 1);
    await expect(page.getByText('2 selected')).toBeVisible();
    // Scope to the selection bar to avoid colliding with drill row times.
    await expect(page.getByTestId('selection-save-btn').locator('xpath=..')).toContainText('01:05.00');
  });

  test('group two drills under a name', async ({ page }) => {
    await seedTwoDrills(page);
    await toggleSelectDrill(page, 0);
    await toggleSelectDrill(page, 1);
    await page.getByTestId('selection-save-btn').click();
    await page.getByTestId('group-name-input').fill('IM Set');
    await page.getByTestId('group-name-confirm-btn').click();
    await expect(page.getByText('IM Set')).toBeVisible();
    // Group container header shows the sum total — scope by testID to avoid
    // matching any other 01:05.00 elsewhere on the page.
    await expect(page.getByTestId('group-header')).toContainText('01:05.00');
  });

  test('deleting 1 drill of a 2-drill group dissolves the group', async ({ page }) => {
    await seedTwoDrills(page);
    await toggleSelectDrill(page, 0);
    await toggleSelectDrill(page, 1);
    await page.getByTestId('selection-save-btn').click();
    await page.getByTestId('group-name-input').fill('Pair');
    await page.getByTestId('group-name-confirm-btn').click();
    await expect(page.getByText('Pair')).toBeVisible();
    // Delete one of the two grouped drills
    await deleteDrill(page, 0);
    await expect(page.getByText('Pair')).not.toBeVisible();
    // The remaining drill is now ungrouped (still visible somewhere on the page)
    const remaining = page.getByText('25M', { exact: false });
    await expect(remaining.first()).toBeVisible();
  });

  test('ungroup keeps drills but removes the group container', async ({ page }) => {
    await seedTwoDrills(page);
    await toggleSelectDrill(page, 0);
    await toggleSelectDrill(page, 1);
    await page.getByTestId('selection-save-btn').click();
    await page.getByTestId('group-name-input').fill('Temp');
    await page.getByTestId('group-name-confirm-btn').click();
    await expect(page.getByText('Temp')).toBeVisible();
    await page.getByTestId('group-ungroup-btn').click();
    await expect(page.getByText('Temp')).not.toBeVisible();
    // Both drills still in the session
    await expect(page.getByText('25M Butterfly')).toBeVisible();
    await expect(page.getByText('25M Backstroke')).toBeVisible();
  });
});
