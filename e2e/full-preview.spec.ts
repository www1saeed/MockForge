import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('full-width preview preserves responses inside the Studio shell', async ({
  page,
}): Promise<void> => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/#workspace');
  await page.getByRole('button', { name: 'Vorschau in voller Breite', exact: true }).click();
  await expect(page.locator('.configuration')).toBeHidden();
  await expect(page.locator('.workflow')).toBeHidden();
  const workspace = await page.locator('.editor-layout').boundingBox();
  const preview = await page.locator('app-form-preview').boundingBox();
  expect(preview!.width).toBeCloseTo(workspace!.width, 0);
  const field = page.locator('#preview-name');
  await field.fill('Preview response');
  await expect(page.locator('.studio-footer')).toBeVisible();
  await page.screenshot({ path: 'reports/full-preview-desktop.png' });
  await page.getByRole('button', { name: 'Zurück zum Editor', exact: true }).click();
  await expect(page.locator('.configuration')).toBeVisible();
  await expect(field).toHaveValue('Preview response');
  await page.getByRole('button', { name: 'Vorschau in voller Breite', exact: true }).click();
  await expect(field).toHaveValue('Preview response');
  await page.setViewportSize({ width: 390, height: 844 });
  await field.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'reports/full-preview-mobile.png' });
  expect(
    await page.evaluate((): boolean => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole('button', { name: 'Vorschau ausblenden', exact: true }).click();
  await expect(page.locator('.configuration')).toBeVisible();
  await expect(page.locator('app-form-preview')).toHaveCount(0);
});
