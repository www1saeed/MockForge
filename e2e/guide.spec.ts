import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('the localized guide explains clipboard, preview data and shell context', async ({
  page,
}): Promise<void> => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#guide');
  for (const [locale, title] of [
    ['DE', 'Felder kopieren und verschieben'],
    ['EN', 'Copy and move fields'],
    ['FA', 'کپی و جابه‌جایی فیلدها'],
  ]) {
    await page
      .locator('.topbar .locale-toggle')
      .getByRole('button', { name: locale, exact: true })
      .click();
    await expect(page.locator('.guide-tools article')).toHaveCount(3);
    await expect(page.locator('.guide-tools h2').first()).toHaveText(title);
    await expect(page.locator('.guide-tools p')).toHaveCount(3);
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    expect(
      await page.evaluate((): boolean => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
  }
  await page.locator('.guide-tools').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'reports/guide-tools-mobile-fa.png' });
});
