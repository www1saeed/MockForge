import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('project shell identity updates live and mobile Persian tools fit the viewport', async ({
  page,
}): Promise<void> => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#workspace');
  const name = 'Example project with a deliberately long name for the navigation';
  await page.locator('#project-name').fill(name);
  const link = page.locator('.sidebar a[href="#workspace"]');
  await expect(link).toHaveAccessibleName(name);
  await expect(link).toHaveAttribute('title', name);
  await page.locator('#project-name').fill('');
  await expect(link).toHaveAccessibleName('Workspace');
  await page.locator('#project-name').fill('My Studio project');
  await page.locator('.topbar .locale-toggle button').filter({ hasText: 'FA' }).click();
  await page.locator('.workflow button').nth(2).click();
  await page.locator('.test-data-toolbar .text-button').click();
  await expect(page.locator('.test-data-dialog')).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  expect(
    await page.evaluate((): boolean => document.documentElement.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.screenshot({ path: 'reports/test-data-mobile-fa.png' });
  await page.locator('.test-data-dialog button').click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator('.breadcrumb')).toContainText('My Studio project');
  await expect(page.locator('.shell-form-title')).not.toBeEmpty();
});
