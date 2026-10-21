import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('test data preserves answers, supports settings and resets without persisting responses', async ({
  page,
}): Promise<void> => {
  await page.goto('/#workspace');
  await page.locator('.workflow button').nth(2).click();
  const preview = page.locator('app-form-preview');
  const form = preview.locator('form');
  const input = form.locator('input[type="text"]').first();
  const before = await page.evaluate(
    (): string => localStorage.getItem('mockforge-studio-v1') ?? '',
  );
  await input.fill('Manual answer');
  await preview.getByRole('button', { name: 'Testdaten einfüllen', exact: true }).click();
  await expect(input).toHaveValue('Manual answer');
  await expect(preview.locator('.test-data-toolbar [role="status"]')).toContainText(
    'Beibehalten: 1',
  );
  await preview.getByRole('button', { name: 'Testdaten-Einstellungen', exact: true }).click();
  const dialog = page.locator('.test-data-dialog');
  await expect(dialog).toBeVisible();
  await page.locator('#data-locale').selectOption('fa');
  await page.locator('#data-seed').fill('2');
  await dialog.getByRole('checkbox').check();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(
    preview.getByRole('button', { name: 'Testdaten-Einstellungen', exact: true }),
  ).toBeFocused();
  await preview.getByRole('button', { name: 'Testdaten einfüllen', exact: true }).click();
  await expect(input).not.toHaveValue('Manual answer');
  expect(await form.evaluate((element: HTMLFormElement): boolean => element.checkValidity())).toBe(
    true,
  );
  expect(await page.evaluate((): string => localStorage.getItem('mockforge-studio-v1') ?? '')).toBe(
    before,
  );
  await page.screenshot({ path: 'reports/test-data-desktop.png' });
  await page.reload();
  await page.locator('.workflow button').nth(2).click();
  await expect(input).toHaveValue('');
});
