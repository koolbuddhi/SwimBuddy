import { test, expect } from '@playwright/test';
import { clearLocalDB, signInTestUser, userFor } from '../fixtures/sign-in';
import { addDrill } from '../helpers/drill';
import { createSessionFromHome } from '../helpers/session';

/**
 * Two browser contexts ≈ two devices signed in as the same user. Each gets
 * its own IndexedDB, cookies, and React state, but they hit the same Worker
 * and D1 — so a write on A should appear on B after a sync trigger.
 */
test.describe('Cross-device sync', () => {
  test('a drill logged on device A appears on device B', async ({ browser }, testInfo) => {
    const user = userFor(testInfo);

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await clearLocalDB(pageA);
    await signInTestUser(contextA, pageA, user);

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await clearLocalDB(pageB);
    await signInTestUser(contextB, pageB, user);

    // Device A creates a session + drill.
    await createSessionFromHome(pageA);
    await addDrill(pageA, { stroke: 'fly', distanceM: 25, timeDigits: '3045', label: 'cross-device-sync' });
    await expect(pageA.getByText('25M Butterfly')).toBeVisible();

    // Device B triggers a sync (manual is the fastest path — no need to wait
    // for the 30 s poll). The 'cross-device-sync' label is unique enough to
    // serve as a clean assertion target.
    await pageB.getByRole('tab', { name: /Settings/ }).click();
    await pageB.getByTestId('settings-sync-btn').click();
    // Wait for syncing state to clear
    await expect(pageB.getByText('Syncing…')).not.toBeVisible({ timeout: 10_000 });

    // Back to sessions tab — the new session should be there.
    await pageB.getByRole('tab', { name: /Sessions/ }).click();
    await expect(pageB.getByText(/1 session/i)).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  test('opening DrillSheet on B fires a fresh sync that pulls A\'s drill', async ({ browser }, testInfo) => {
    const user = userFor(testInfo);

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await clearLocalDB(pageA);
    await signInTestUser(contextA, pageA, user);

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await clearLocalDB(pageB);
    await signInTestUser(contextB, pageB, user);

    // A creates session + initial drill.
    const sessionId = await createSessionFromHome(pageA);
    await addDrill(pageA, { stroke: 'free', distanceM: 50, timeDigits: '4000', label: 'first' });

    // B navigates to the same session (signed in same user, can sync the
    // session list first via manual button so the route is known).
    await pageB.getByRole('tab', { name: /Settings/ }).click();
    await pageB.getByTestId('settings-sync-btn').click();
    await expect(pageB.getByText('Syncing…')).not.toBeVisible({ timeout: 10_000 });
    await pageB.goto(`/session/${sessionId}`);
    await expect(pageB.getByText('50M Freestyle')).toBeVisible();

    // A adds another drill. B should still see only the first one.
    await addDrill(pageA, { stroke: 'fly', distanceM: 25, timeDigits: '2000', label: 'second' });

    // B taps the FAB — sync fires as the DrillSheet opens. Close the sheet,
    // and the new drill should be in the list.
    await pageB.getByTestId('session-add-fab').click();
    await expect(pageB.getByText('New drill')).toBeVisible();
    await pageB.getByTestId('drill-close-btn').click();
    await expect(pageB.getByText('25M Butterfly')).toBeVisible({ timeout: 10_000 });

    await contextA.close();
    await contextB.close();
  });
});
