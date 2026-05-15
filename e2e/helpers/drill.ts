import { expect, type Page } from '@playwright/test';

type StrokeId = 'fly' | 'back' | 'breast' | 'free' | 'mixed';

interface AddDrillOpts {
  stroke?: StrokeId;
  distanceM?: 5 | 15 | 25 | 50;
  /** 6-digit MMSSCC string, e.g. "003045" → 00:30.45, "013000" → 01:30.00. */
  timeDigits: string;
  label?: string;
}

/** Open the new-drill sheet, fill it in, and tap Save. Leaves the user
 *  back on the session screen. */
export async function addDrill(page: Page, opts: AddDrillOpts): Promise<void> {
  await page.getByTestId('session-add-fab').click();
  await expect(page.getByText('New drill')).toBeVisible();

  if (opts.stroke) {
    await page.getByTestId(`stroke-pill-${opts.stroke}`).click();
  }
  if (opts.distanceM) {
    await page.getByTestId(`dist-chip-${opts.distanceM}`).click();
  }

  // The time input is a hidden text field; setting value via fill + input
  // event triggers the controlled onChangeText, exactly like real typing.
  const timeInput = page.getByTestId('time-hidden-input');
  await timeInput.fill(opts.timeDigits);

  if (opts.label) {
    await page.getByTestId('drill-label-input').fill(opts.label);
  }

  await page.getByTestId('drill-save-btn').click();
  await expect(page.getByText('New drill')).not.toBeVisible();
}

/** Open the edit sheet for the Nth drill row (0-indexed), apply edits, save. */
export async function editDrill(
  page: Page,
  index: number,
  patch: Partial<AddDrillOpts>,
): Promise<void> {
  const editBtns = page.getByTestId('drill-edit-btn');
  await editBtns.nth(index).click();
  await expect(page.getByText('Edit drill')).toBeVisible();

  if (patch.stroke) {
    await page.getByTestId(`stroke-pill-${patch.stroke}`).click();
  }
  if (patch.distanceM) {
    await page.getByTestId(`dist-chip-${patch.distanceM}`).click();
  }
  if (patch.timeDigits) {
    // Clear via the explicit clear button, then re-fill.
    const clearBtn = page.getByTestId('time-clear-btn');
    if (await clearBtn.isVisible()) await clearBtn.click();
    await page.getByTestId('time-hidden-input').fill(patch.timeDigits);
  }
  if (patch.label !== undefined) {
    await page.getByTestId('drill-label-input').fill(patch.label);
  }

  await page.getByTestId('drill-save-btn').click();
  await expect(page.getByText('Edit drill')).not.toBeVisible();
}

/** Press the trash icon on row N and confirm the dialog. */
export async function deleteDrill(page: Page, index: number): Promise<void> {
  await page.getByTestId('drill-delete-btn').nth(index).click();
  await expect(page.getByText('Delete drill?')).toBeVisible();
  await page.getByTestId('confirm-ok-btn').click();
  await expect(page.getByText('Delete drill?')).not.toBeVisible();
}

/** Tap a drill row to toggle its selection (used for grouping). */
export async function toggleSelectDrill(page: Page, index: number): Promise<void> {
  await page.getByTestId('drill-row-main').nth(index).click();
}
