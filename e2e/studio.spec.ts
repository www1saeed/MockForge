import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

test('button deletion and preview delete simulations require confirmation on mobile', async ({
  page,
}): Promise<void> => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#workspace');
  await page.locator('.workflow button').nth(3).click();
  await page.locator('#submit-action').selectOption('delete');
  await page.getByRole('button', { name: 'Vorschau einblenden' }).click();
  await page.locator('.preview-submit').click();
  await expect(page.locator('.delete-dialog')).toBeVisible();
  await expect(page.locator('#delete-description')).toContainText('Löschsimulation');
  await page.locator('.delete-confirm-button').click();
  await expect(page.locator('.toast-warning')).toBeVisible();
  await expect(page.locator('.button-card')).toHaveCount(1);
  await page.locator('.toast-close').click();
  await page.getByRole('button', { name: 'Button entfernen', exact: true }).click();
  await expect(page.locator('.delete-dialog')).toBeVisible();
  await page.screenshot({ path: 'reports/delete-dialog-mobile.png' });
  await page.locator('.delete-confirm-button').click();
  await expect(page.locator('#submit-action')).toHaveCount(0);
  await expect(page.locator('.toast-success')).toContainText('Der Button wurde gelöscht');
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: 'reports/delete-toast-mobile.png' });
});

test('field actions stay beside the list and preview remains pinned while editing buttons', async ({
  page,
}): Promise<void> => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/#workspace');
  await page.locator('.workflow button').nth(3).click();
  const tools = page.locator('.field-list-tools');
  await expect(tools.locator('button').first()).toBeDisabled();
  await tools.locator('button').nth(1).click();
  await expect(page.locator('.field-row.chosen .field-index')).toHaveText('02');
  await tools.locator('button').first().click();
  const count = await page.locator('.field-row').count();
  await expect(tools.locator('.field-delete svg')).toBeVisible();
  await tools.locator('.field-delete').click();
  await expect(page.locator('.field-row')).toHaveCount(count);
  await expect(page.locator('.delete-dialog')).toBeVisible();
  await expect(page.locator('.delete-dialog .secondary-button')).toBeFocused();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: 'reports/delete-dialog.png' });
  await page.locator('.delete-dialog .secondary-button').click();
  await expect(page.locator('.field-row')).toHaveCount(count);
  await tools.locator('.field-delete').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.field-row')).toHaveCount(count);
  await tools.locator('.field-delete').click();
  await page.locator('.delete-confirm-button').click();
  await expect(page.locator('.field-row')).toHaveCount(count - 1);
  await expect(page.locator('.toast-success')).toContainText('Das Feld wurde gelöscht');
  await page.screenshot({ path: 'reports/delete-toast.png' });
  await page.getByRole('button', { name: 'Vorschau einblenden' }).click();
  await page.locator('.button-editor').scrollIntoViewIfNeeded();
  const preview = await page.locator('.preview-panel').boundingBox();
  const header = await page.locator('.topbar').boundingBox();
  expect(preview).not.toBeNull();
  expect(preview!.y).toBeGreaterThanOrEqual(header ? header.y + header.height : 76);
  expect(preview!.y).toBeLessThan(130);
  await page.screenshot({ path: 'reports/editor-sticky-preview.png' });
});

test('overview and full workspace keep the author visible and let preview be hidden', async ({
  page,
}): Promise<void> => {
  await page.goto('/');
  await expect(page.locator('.overview-grid')).toBeVisible();
  await expect(page.locator('.workspace')).toHaveCount(0);
  await expect(page.locator('.studio-footer a')).toHaveText('© 1Saeed.com');
  await expect(page.locator('.studio-footer a')).toHaveAttribute('href', 'https://1saeed.com/');
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: 'reports/overview-desktop.png' });
  await page.getByRole('link', { name: 'Workspace', exact: true }).click();
  await expect(page.locator('.hero')).toHaveCount(0);
  await expect(page.locator('.preview-panel')).toHaveCount(0);
  await expect(page.locator('.configuration')).toBeVisible();
  await page.locator('.workflow button').nth(3).click();
  await page.screenshot({ path: 'reports/editor-full-desktop.png' });
  await page.getByRole('button', { name: 'Vorschau einblenden' }).click();
  await expect(page.locator('.preview-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Vorschau ausblenden' }).click();
  await expect(page.locator('.preview-panel')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('link', { name: 'Überblick', exact: true }).click();
  expect(
    await page.evaluate((): boolean => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await page.screenshot({ path: 'reports/overview-mobile.png' });
});

test('form language selection, localized tooltips, patterns and configured buttons survive transfer', async ({
  page,
}): Promise<void> => {
  await page.goto('/#workspace');
  await page.locator('.workflow button').nth(1).click();
  await page.locator('#form-language-de').uncheck();
  await expect(page.locator('#title-de')).toHaveCount(0);
  await page.locator('.workflow button').nth(3).click();
  await expect(page.locator('#field-label-de')).toHaveCount(0);
  await expect(page.locator('#field-label-en')).toBeVisible();
  await page.locator('.workflow button').nth(1).click();
  await page.locator('#form-language-de').check();
  await page.screenshot({ path: 'reports/languages-desktop.png' });
  await page.locator('.workflow button').nth(3).click();
  await page.locator('#field-tooltip-de').fill('Genau drei Großbuchstaben');
  await page.locator('#field-tooltip-en').fill('Exactly three uppercase letters');
  await page.locator('#field-pattern-message-en').fill('Enter three uppercase letters');
  await page.locator('#field-pattern').fill('[');
  await expect(page.locator('.pattern-error')).toBeVisible();
  await page.locator('#field-pattern').fill('[A-Z]{3}');
  await expect(page.locator('.pattern-error')).toHaveCount(0);
  await page.getByRole('button', { name: 'Button hinzufügen' }).click();
  await page.locator('#button-1-label-de').fill('Leeren');
  await page.locator('#button-1-label-en').fill('Clear');
  await page.locator('#button-1-action').selectOption('reset');
  await page.locator('#button-1-variant').selectOption('secondary');
  await page.locator('#button-1-classes').fill('w-100');
  await page.locator('#button-1-note').fill('Clear only preview entries.');
  await page.locator('.button-editor').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'reports/buttons-desktop.png' });
  await page.getByRole('button', { name: 'Vorschau einblenden' }).click();
  await page.locator('.preview-panel').getByRole('button', { name: 'EN', exact: true }).click();
  await page.locator('.field-tooltip-button').hover();
  await expect(page.locator('.tooltip-inner')).toHaveText('Exactly three uppercase letters');
  await page.locator('#preview-name').fill('ABCD');
  await page.locator('#preview-email').fill('alex@example.com');
  await page.locator('#preview-company').fill('Acme');
  await page.locator('#preview-team').selectOption('0');
  await page.locator('#preview-privacy').check();
  await page.locator('.button-primary').click();
  await expect(page.locator('.simulation-result')).toHaveCount(0);
  expect(
    await page
      .locator('#preview-name')
      .evaluate((element: HTMLInputElement): string => element.validationMessage),
  ).toBe('Enter three uppercase letters');
  await page.locator('#preview-name').fill('ABC');
  await page.locator('.button-primary').click();
  await expect(page.locator('.simulation-result')).toBeVisible();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.locator('#preview-name')).toHaveValue('');
  await expect(page.locator('.simulation-result')).toHaveText('Form inputs cleared.');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON exportieren' }).click();
  const path = await (await downloadEvent).path();
  if (!path) throw new Error('Export missing');
  const exported = JSON.parse(await readFile(path, 'utf8'));
  expect(exported.schemaVersion).toBe('1.3.0');
  expect(exported.fields[0].pattern).toBe('[A-Z]{3}');
  expect(exported.buttons[1].action).toBe('reset');
  expect(exported.buttons[1].note).toBe('Clear only preview entries.');
  await page.reload();
  await page.locator('.workflow button').nth(3).click();
  await expect(page.locator('#field-tooltip-en')).toHaveValue('Exactly three uppercase letters');
  await expect(page.locator('#button-1-action')).toHaveValue('reset');
});

test('Persian UI and preview use RTL while form languages stay limited to two', async ({
  page,
}): Promise<void> => {
  await page.goto('/#workspace');
  await page.locator('.workflow button').nth(1).click();
  await page.locator('#form-language-en').uncheck();
  await page.locator('#form-language-fa').check();
  await expect(page.locator('#form-language-en')).toBeDisabled();
  await expect(page.locator('#title-fa')).toHaveValue('گردش کار بعدی شما از اینجا آغاز می‌شود.');

  await page.locator('.topbar').getByRole('button', { name: 'FA', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('.section-description')).toContainText('یک یا دو زبان');
  await page.getByRole('button', { name: 'نمایش پیش‌نمایش' }).click();
  await page.locator('.preview-panel').getByRole('button', { name: 'FA', exact: true }).click();
  await expect(page.locator('.rendered-form')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('.rendered-form h3')).toHaveText(
    'گردش کار بعدی شما از اینجا آغاز می‌شود.',
  );
  expect(
    await page
      .locator('.rendered-form')
      .evaluate((element): boolean => getComputedStyle(element).fontFamily.includes('IRANSans')),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: 'reports/persian-rtl-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate((): boolean => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await page.screenshot({ path: 'reports/persian-rtl-mobile.png' });
});

test('configure, restore, export and import a commercial form', async ({ page }): Promise<void> => {
  await page.goto('/#workspace');
  await page.getByRole('button', { name: '3 Design auswählen' }).click();
  await page.getByRole('button', { name: 'Carbon', exact: false }).click();
  await expect(page.locator('.theme-carbon')).toBeVisible();
  await page.getByRole('button', { name: '4 Formular gestalten' }).click();
  await page.getByRole('button', { name: 'Feld hinzufügen' }).click();
  await page.locator('#field-label-de').fill('Kundenreferenz');
  await page.reload();
  await page.locator('.workflow button').nth(3).click();
  await expect(page.locator('.field-list')).toContainText('Kundenreferenz');
  await page.locator('.topbar').getByRole('button', { name: 'EN', exact: true }).click();
  await page.getByRole('button', { name: 'Show preview', exact: true }).click();
  await page.locator('.preview-panel').getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.locator('.rendered-form h3')).toHaveText('Your next workflow starts here.');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const download = await downloadEvent;
  const path = await download.path();
  if (!path) throw new Error('Export missing');
  await page.locator('input[type=file]').setInputFiles(path);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Replace draft', exact: true }).click();
  await expect(page.locator('.field-list')).toContainText('New field');
  await page.getByRole('button', { name: 'Show preview', exact: true }).click();
  await expect(page.locator('.theme-carbon')).toBeVisible();
});

test('invalid import preserves the draft and example replacement can be cancelled', async ({
  page,
}): Promise<void> => {
  await page.goto('/#workspace');
  await page.locator('input[type=file]').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schemaVersion":"unknown"}'),
  });
  await expect(page.getByRole('alert')).toContainText('Ungültige Datei');
  await expect(page.locator('.workspace-heading')).toContainText('Orbit');
  await page.getByRole('link', { name: 'Business-Beispiele' }).click();
  await page.getByRole('button', { name: 'Beispiel öffnen' }).nth(1).click();
  await page.getByRole('button', { name: 'Abbrechen' }).click();
  await page.getByRole('link', { name: 'Workspace', exact: true }).click();
  await expect(page.locator('.workspace-heading')).toContainText('Orbit');
});

test('native validation blocks incomplete preview and simulates a valid request', async ({
  page,
}): Promise<void> => {
  await page.goto('/#workspace');
  await page.getByRole('button', { name: 'Vorschau einblenden' }).click();
  await page.locator('.preview-submit').click();
  await expect(page.locator('.simulation-result')).toHaveCount(0);
  await page.locator('#preview-name').fill('Alex Morgan');
  await page.locator('#preview-email').fill('alex@example.com');
  await page.locator('#preview-company').fill('Acme');
  await page.locator('#preview-team').selectOption('0');
  await page.locator('#preview-privacy').check();
  await page.locator('.preview-submit').click();
  await expect(page.locator('.simulation-result')).toBeVisible();
});

test('records a complete review, exports its handoff and invalidates it after a field edit', async ({
  page,
}): Promise<void> => {
  await page.goto('/#workspace');
  await page.locator('.workflow button').nth(0).click();
  await page.getByLabel('Product Owner', { exact: true }).fill('Taylor');
  await page.locator('.workflow button').nth(4).click();
  await expect(page.getByRole('button', { name: 'Review dokumentieren' })).toBeDisabled();
  await page.getByLabel('Offene Fragen (vor Freigabe leeren)').fill('');
  await page.getByLabel('Name der prüfenden Person').fill('Taylor');
  for (const checkbox of await page.locator('.review-checklist input').all())
    await checkbox.check();
  await page.getByRole('button', { name: 'Review dokumentieren' }).click();
  await expect(page.locator('.review-record')).toContainText('Taylor');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Brief exportieren' }).click();
  const file = await (await downloading).path();
  if (!file) throw new Error('Brief export missing');
  const content = await readFile(file, 'utf8');
  expect(content).toContain('Reviewer: Taylor');
  expect(content).toContain('Full name');
  await page.locator('.workflow button').nth(3).click();
  await page.locator('#field-label-de').fill('Dein vollständiger Name');
  await page.locator('.workflow button').nth(4).click();
  await expect(page.locator('.review-record')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Review dokumentieren' })).toBeDisabled();
});

test('both locales, each workflow step, themes and mobile layout pass an axe scan', async ({
  page,
}): Promise<void> => {
  await page.goto('/#workspace');
  for (const locale of ['DE', 'EN']) {
    await page.locator('.topbar').getByRole('button', { name: locale, exact: true }).click();
    for (let step = 0; step < 5; step++) {
      await page.locator('.workflow button').nth(step).click();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    }
    await page
      .getByRole('link', {
        name: locale === 'DE' ? 'Business-Beispiele' : 'Business examples',
        exact: true,
      })
      .click();
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    await page
      .getByRole('button', { name: locale === 'DE' ? 'Beispiel öffnen' : 'Open example' })
      .first()
      .click();
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page
      .getByRole('link', { name: locale === 'DE' ? 'Arbeitsweise' : 'How it works', exact: true })
      .click();
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    await page.getByRole('link', { name: 'Workspace', exact: true }).click();
  }
  await page.locator('.workflow button').nth(2).click();
  for (const theme of ['Material', 'Carbon', 'Fluent']) {
    await page.getByRole('button', { name: theme, exact: false }).click();
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate((): boolean => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
});
