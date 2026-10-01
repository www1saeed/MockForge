import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Bootstrap form tooltips support title/icon placement and appear once per repeated definition', async ({
  page,
}): Promise<void> => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/#examples');
  await page.locator('.example-card').filter({ hasText: 'Atlas' }).getByRole('button').click();
  await page.locator('.replace-dialog .primary-button').click();
  await page.locator('.toast-close').click();
  await page.locator('.root-field-list .field-row').first().click();
  await page.locator('#field-tooltip-de').fill('Titelhilfe <strong>als Text</strong>');
  await page.locator('#field-tooltip-en').fill('Title help');
  await page.locator('#field-tooltip-placement').selectOption('title');
  await page.getByRole('button', { name: 'Vorschau einblenden', exact: true }).click();
  const root = page
    .locator('app-preview-field')
    .filter({ has: page.locator('[data-field-id=project-title]') });
  const title = root.locator('.field-title-text');
  await title.focus();
  await expect(page.locator('.tooltip-inner')).toHaveText('Titelhilfe <strong>als Text</strong>');
  await expect(page.locator('.tooltip-inner strong')).toHaveCount(0);
  await page.screenshot({ path: 'reports/form-tooltip-title-desktop.png' });
  await title.press('Escape');
  await expect(page.locator('.tooltip')).toHaveCount(0);
  await page.locator('#field-tooltip-placement').selectOption('icon');
  await root.locator('.field-tooltip-button').hover();
  await expect(page.locator('.tooltip-inner')).toContainText('Titelhilfe');
  await root.locator('.field-tooltip-button').press('Escape');
  await page.locator('#field-tooltip-placement').selectOption('info');
  await expect(root.locator('.field-tooltip-button svg path')).toHaveAttribute('d', 'M12 11v7');
  await root.locator('.field-tooltip-button').hover();
  await expect(page.locator('.tooltip-inner')).toContainText('Titelhilfe');
  await page.screenshot({ path: 'reports/form-tooltip-info-desktop.png' });
  await root.locator('.field-tooltip-button').press('Escape');
  await page.locator('.root-field-list .field-row').filter({ hasText: 'Projektteam' }).click();
  await expect(page.locator('#field-tooltip-placement')).toBeVisible();
  await page.getByRole('button', { name: 'Unterfelder bearbeiten', exact: true }).click();
  await page.locator('#field-tooltip-de').fill('Einmalige Namenshilfe');
  await page.locator('#field-tooltip-en').fill('Name help once');
  const cards = page.locator('app-repeat-group').filter({ has: page.locator('.repeat-cards') });
  await cards.locator('.repeat-add').click();
  await expect(cards.locator('.repeat-card')).toHaveCount(2);
  await expect(cards.locator('.repeat-card .field-tooltip-button')).toHaveCount(1);
  await cards.locator('.repeat-card .field-tooltip-button').focus();
  await expect(page.locator('.tooltip-inner')).toHaveText('Einmalige Namenshilfe');
  await cards.locator('.repeat-card .field-tooltip-button').press('Escape');
  await page.locator('#group-layout').selectOption('table');
  await expect(cards).toHaveCount(0);
  const tableGroup = page.locator('app-repeat-group').first();
  await tableGroup.locator('.repeat-add').click();
  await expect(tableGroup.locator('tbody tr')).toHaveCount(2);
  await expect(tableGroup.locator('thead .field-tooltip-button')).toHaveCount(1);
  await expect(tableGroup.locator('tbody .field-tooltip-button')).toHaveCount(0);
  await tableGroup.locator('thead .field-tooltip-button').hover();
  await expect(page.locator('.tooltip-inner')).toHaveText('Einmalige Namenshilfe');
  await page.screenshot({ path: 'reports/form-tooltip-table-desktop.png' });
  await tableGroup.locator('thead .field-tooltip-button').press('Escape');
  await page
    .locator('.preview-panel .locale-toggle')
    .getByRole('button', { name: 'EN', exact: true })
    .click();
  await tableGroup.locator('thead .field-tooltip-button').focus();
  await expect(page.locator('.tooltip-inner')).toHaveText('Name help once');
  await tableGroup.locator('thead .field-tooltip-button').press('Escape');
  await page.reload();
  await page.locator('.workflow button').nth(3).click();
  await page.locator('.root-field-list .field-row').first().click();
  await expect(page.locator('#field-tooltip-placement')).toHaveValue('info');
  await page.getByRole('button', { name: 'Vorschau einblenden', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await root.locator('.field-tooltip-button').focus();
  await expect(page.locator('.tooltip-inner')).toContainText('Titelhilfe');
  await page.screenshot({ path: 'reports/form-tooltip-mobile.png' });
  await root.locator('.field-tooltip-button').press('Escape');
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  expect(
    await page.evaluate((): boolean => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
});
