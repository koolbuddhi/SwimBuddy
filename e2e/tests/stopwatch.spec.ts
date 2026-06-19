import { test, expect } from '@playwright/test';
import { clearLocalDB, signInTestUser, userFor } from '../fixtures/sign-in';
import { createSessionFromHome } from '../helpers/session';

test.describe('Stopwatch widget', () => {
  test.beforeEach(async ({ context, page }, testInfo) => {
    await clearLocalDB(page);
    await signInTestUser(context, page, userFor(testInfo));
  });

  test('start → stop → use fills the time field and the drill saves', async ({ page }) => {
    await createSessionFromHome(page);
    await page.getByTestId('session-add-fab').click();
    await expect(page.getByText('New drill')).toBeVisible();

    // Pick a stroke + distance so save is enabled once the time arrives.
    await page.getByTestId('stroke-pill-free').click();
    await page.getByTestId('dist-chip-50').click();

    // Idle display shows the placeholder.
    await expect(page.getByTestId('stopwatch-display')).toHaveText('--:--.--');

    // Run for ~1.2s of wall-clock.
    await page.getByTestId('stopwatch-start').click();
    await page.waitForTimeout(1200);
    await page.getByTestId('stopwatch-stop').click();

    // After Stop the display freezes; capture and assert it lies in a sane band.
    const stoppedDisplay = await page.getByTestId('stopwatch-display').textContent();
    expect(stoppedDisplay).toMatch(/^00:0[12]\.\d{2}$/);

    // Use writes the value into the existing time-display, then resets the widget.
    await page.getByTestId('stopwatch-use').click();
    await expect(page.getByTestId('stopwatch-display')).toHaveText('--:--.--');
    await expect(page.getByTestId('stopwatch-start')).toBeVisible();
    const timeShown = await page.getByTestId('time-display').textContent();
    expect(timeShown).toMatch(/^00:0[12]\.\d{2}/);

    // Save and verify the drill persisted with that time.
    await page.getByTestId('drill-save-btn').click();
    await expect(page.getByText('New drill')).not.toBeVisible();
    await expect(page.getByText('50M Freestyle')).toBeVisible();
    await expect(page.getByText(/00:0[12]\.\d{2}/)).toBeVisible();
  });

  test('reset clears the widget without touching the time field', async ({ page }) => {
    await createSessionFromHome(page);
    await page.getByTestId('session-add-fab').click();

    // Pre-fill a manual time so we can confirm reset doesn't disturb it.
    await page.getByTestId('time-hidden-input').fill('3045');
    await expect(page.getByTestId('time-display')).toContainText('00:30.45');

    await page.getByTestId('stopwatch-start').click();
    await page.waitForTimeout(400);
    await page.getByTestId('stopwatch-stop').click();
    await page.getByTestId('stopwatch-reset').click();

    // Widget back to idle, manual time untouched.
    await expect(page.getByTestId('stopwatch-display')).toHaveText('--:--.--');
    await expect(page.getByTestId('stopwatch-start')).toBeVisible();
    await expect(page.getByTestId('time-display')).toContainText('00:30.45');
  });
});
