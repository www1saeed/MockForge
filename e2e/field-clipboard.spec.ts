import { expect, Page, test } from '@playwright/test';

async function dismissToasts(page: Page): Promise<void> {
  while (await page.locator('.toast-close').count())
    await page.locator('.toast-close').first().click();
}

test('clipboard survives steps, copies full groups, moves children and clears on reload', async ({
  page,
}): Promise<void> => {
  await page.goto('/#examples');
  await page.locator('.example-card').filter({ hasText: 'Atlas' }).getByRole('button').click();
  await page.locator('.replace-dialog .primary-button').click();
  const list = page.locator('.root-field-list');
  const original = await list.locator('.field-row').count();
  await list.locator('.field-row').filter({ hasText: 'Projektteam' }).click();
  await list.getByRole('button', { name: 'Kopieren', exact: true }).click();
  await dismissToasts(page);
  await page.locator('.workflow button').nth(0).click();
  await page.locator('.workflow button').nth(3).click();
  await list.getByRole('button', { name: 'Einfügen', exact: true }).click();
  await expect(list.locator('.field-row')).toHaveCount(original + 1);
  await page.getByRole('button', { name: 'Unterfelder bearbeiten', exact: true }).click();
  const children = page.locator('.group-child-list');
  const childCount = await children.locator('.field-row').count();
  await children.getByRole('button', { name: 'Ausschneiden', exact: true }).click();
  await expect(children.locator('.field-row')).toHaveCount(childCount);
  await page.getByRole('button', { name: 'Unterfeldbereich schließen', exact: true }).click();
  await list.getByRole('button', { name: 'Einfügen', exact: true }).click();
  await expect(list.locator('.field-row')).toHaveCount(original + 2);
  await expect(list.getByRole('button', { name: 'Einfügen', exact: true })).toBeDisabled();
  await list.getByRole('button', { name: 'Kopieren', exact: true }).click();
  await page.reload();
  await page.locator('.workflow button').nth(3).click();
  await expect(list.getByRole('button', { name: 'Einfügen', exact: true })).toBeDisabled();
  const saved = await page.evaluate((): string => localStorage.getItem('mockforge-studio-v1')!);
  expect(saved).not.toContain('clipboard');
});
