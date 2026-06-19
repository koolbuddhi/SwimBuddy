import { test, expect } from '@playwright/test';
import { clearLocalDB, signInTestUser, userFor } from '../fixtures/sign-in';
import { addDrill } from '../helpers/drill';
import { createSessionFromHome } from '../helpers/session';

test.describe('Sharing — write share', () => {
  test('invite → accept → recipient sees owner\'s session via the swimmer switcher', async ({ browser }, testInfo) => {
    const owner = userFor(testInfo, 'owner');
    const recipient = userFor(testInfo, 'recipient');

    // ── 1. Owner signs in, creates a session with one drill ───────────────
    const ownerCtx = await browser.newContext();
    const ownerPage = await ownerCtx.newPage();
    await clearLocalDB(ownerPage);
    await signInTestUser(ownerCtx, ownerPage, owner);
    await createSessionFromHome(ownerPage);
    await addDrill(ownerPage, { stroke: 'free', distanceM: 50, timeDigits: '3000' });
    await expect(ownerPage.getByText('50M Freestyle')).toBeVisible();

    // ── 2. Owner invites the recipient with write permission ──────────────
    await ownerPage.getByRole('tab', { name: /Settings/ }).click();
    await ownerPage.getByTestId('share-invite-btn').click();
    await ownerPage.getByTestId('share-invite-email').fill(recipient.email);
    await ownerPage.getByTestId('share-perm-write').click();
    await ownerPage.getByTestId('share-invite-submit').click();
    // Dialog closes; the share row appears in I've shared with.
    await expect(ownerPage.getByText(recipient.email)).toBeVisible();

    // ── 3. Recipient signs in in a separate context ───────────────────────
    const recipCtx = await browser.newContext();
    const recipPage = await recipCtx.newPage();
    await clearLocalDB(recipPage);
    await signInTestUser(recipCtx, recipPage, recipient);

    // ── 4. Recipient navigates to Settings and accepts the invitation ─────
    await recipPage.getByRole('tab', { name: /Settings/ }).click();
    await recipPage.getByTestId('share-refresh-btn').click();
    const acceptBtn = recipPage.getByTestId(/^share-accept-/).first();
    await expect(acceptBtn).toBeVisible({ timeout: 10_000 });
    await acceptBtn.click();

    // ── 5. Recipient goes Home, sees a swimmer switcher with owner chip ───
    await recipPage.getByRole('tab', { name: /Home/ }).click();
    const ownerChip = recipPage.getByTestId(`swimmer-chip-${owner.id}`);
    await expect(ownerChip).toBeVisible({ timeout: 10_000 });

    // ── 6. Tapping the chip shows the owner's session ─────────────────────
    await ownerChip.click();
    await expect(recipPage.getByTestId('shared-view-banner')).toBeVisible();
    await expect(recipPage.getByText('50M Freestyle')).toBeVisible();

    await ownerCtx.close();
    await recipCtx.close();
  });
});

test.describe('Sharing — read share', () => {
  test('read-only recipient cannot see edit / FAB controls', async ({ browser }, testInfo) => {
    const owner = userFor(testInfo, 'owner');
    const recipient = userFor(testInfo, 'recipient');

    const ownerCtx = await browser.newContext();
    const ownerPage = await ownerCtx.newPage();
    await clearLocalDB(ownerPage);
    await signInTestUser(ownerCtx, ownerPage, owner);
    await createSessionFromHome(ownerPage);
    await addDrill(ownerPage, { stroke: 'fly', distanceM: 25, timeDigits: '3045' });

    await ownerPage.getByRole('tab', { name: /Settings/ }).click();
    await ownerPage.getByTestId('share-invite-btn').click();
    await ownerPage.getByTestId('share-invite-email').fill(recipient.email);
    await ownerPage.getByTestId('share-perm-read').click();
    await ownerPage.getByTestId('share-invite-submit').click();

    const recipCtx = await browser.newContext();
    const recipPage = await recipCtx.newPage();
    await clearLocalDB(recipPage);
    await signInTestUser(recipCtx, recipPage, recipient);

    await recipPage.getByRole('tab', { name: /Settings/ }).click();
    await recipPage.getByTestId('share-refresh-btn').click();
    await recipPage.getByTestId(/^share-accept-/).first().click();

    await recipPage.getByRole('tab', { name: /Home/ }).click();
    await recipPage.getByTestId(`swimmer-chip-${owner.id}`).click();
    await expect(recipPage.getByTestId('shared-view-banner')).toBeVisible();
    await expect(recipPage.getByText(/View only/)).toBeVisible();

    // Home FAB should be hidden in read-only view.
    await expect(recipPage.getByTestId('home-fab')).not.toBeVisible();

    // Open the shared session; drill rows should have no edit / delete buttons.
    await recipPage.getByTestId('session-card').first().click();
    await expect(recipPage.getByTestId('session-add-fab')).not.toBeVisible();
    await expect(recipPage.getByTestId('drill-edit-btn')).not.toBeVisible();
    await expect(recipPage.getByTestId('drill-delete-btn')).not.toBeVisible();

    await ownerCtx.close();
    await recipCtx.close();
  });
});
