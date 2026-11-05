import { expect, Page, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import type { ApplicationExampleKind } from '../src/app/application-examples';
import type { ApplicationProject } from '../src/app/application-project';
import { tagsFor } from './test-tags';

async function example(kind: ApplicationExampleKind): Promise<ApplicationProject> {
  return JSON.parse(
    await readFile(
      new URL(`../src/assets/guides/studio-${kind}.form.json`, import.meta.url),
      'utf8',
    ),
  ) as ApplicationProject;
}

async function load(page: Page, kind: ApplicationExampleKind): Promise<void> {
  await page.goto('/#examples');
  await page
    .locator(`.example-${kind}`)
    .locator('..')
    .getByRole('button', { name: /^Beispiel öffnen/ })
    .click();
  await page.locator('.replace-dialog .primary-button').click();
  await expect(page.locator('.workspace-heading')).toContainText((await example(kind)).name);
}
async function application(page: Page): Promise<void> {
  await page.locator('.sidebar a[href="#application"]').click();
}

test(
  'starter example provides one complete validated CRUD list and uses the same downloadable data',
  {
    tag: tagsFor('examples', 'examples-starter', { areas: ['authoring', 'lists', 'transfer'] }),
  },
  async ({ page }) => {
    await load(page, 'starter');
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('mockforge-studio-v1')!),
    );
    expect(saved).toEqual(await example('starter'));
    await application(page);
    await expect(page.locator('.application-menu a')).toHaveCount(2);
    await page.locator('.application-menu a[href*="/list/"]').click();
    await page.getByRole('button', { name: 'Eintrag erstellen', exact: true }).click();
    const dialog = page.locator('.collection-dialog');
    await dialog.locator('#preview-name').fill('Ada Example');
    await dialog.locator('#preview-email').fill('ada@example.org');
    await dialog.getByRole('button', { name: 'Eintrag speichern', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('.collection-table tbody')).toContainText('Ada Example');
    await expect(page.getByRole('button', { name: 'Bearbeiten', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Löschen', exact: true })).toBeVisible();
  },
);

test(
  'intermediate example edits repeated table rows and shares records with filtered and read-only views',
  {
    tag: tagsFor('examples', 'examples-groups', { areas: ['authoring', 'groups', 'lists'] }),
  },
  async ({ page }) => {
    await load(page, 'groups');
    await application(page);
    await expect(page.locator('app-repeat-group .repeat-table')).toBeVisible();
    await page.locator('.application-menu a[href$="/all-requests"]').click();
    await page.getByRole('button', { name: 'Eintrag erstellen', exact: true }).click();
    const dialog = page.locator('.collection-dialog');
    await dialog.locator('#preview-request-title').fill('Laptop request');
    await dialog.locator('#preview-requester-email').fill('requester@example.org');
    await dialog.locator('#preview-department').selectOption('0');
    await dialog.locator('#preview-status').selectOption('0');
    await dialog.locator('.repeat-add').click();
    const rows = dialog.locator('.repeat-table tbody tr');
    await expect(rows).toHaveCount(2);
    for (let index = 0; index < 2; index++) {
      await rows
        .nth(index)
        .locator('[data-field-id="item-code"]')
        .fill(index ? 'IT-2049' : 'IT-2048');
      await rows
        .nth(index)
        .locator('[data-field-id="item-description"]')
        .fill(index ? 'Monitor' : 'Laptop');
      await rows.nth(index).locator('[data-field-id="quantity"]').fill('2');
      await rows.nth(index).locator('[data-field-id="category"]').selectOption('0');
    }
    await dialog.getByRole('button', { name: 'Eintrag speichern', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await page.locator('.application-menu a[href$="/new-requests"]').click();
    await expect(page.locator('.collection-table tbody')).toContainText('Laptop request');
    await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(1).locator('[data-field-id="item-description"]')).toHaveValue('Monitor');
    await dialog.locator('#preview-status').selectOption('1');
    await dialog.getByRole('button', { name: 'Eintrag speichern', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('.collection-table tbody')).not.toContainText('Laptop request');
    await page.locator('.application-menu a[href$="/request-overview"]').click();
    await expect(page.locator('.collection-table tbody')).toContainText('Laptop request');
    for (const name of ['Eintrag erstellen', 'Bearbeiten', 'Löschen'])
      await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ansehen', exact: true })).toBeVisible();
  },
);

test(
  'extensive example keeps both form datasets independent and exports all screens with its theme',
  {
    tag: tagsFor('examples', 'examples-workspace', {
      areas: ['forms', 'lists', 'transfer', 'navigation'],
    }),
  },
  async ({ page, browser }, info) => {
    await load(page, 'workspace');
    await expect(page.locator('#active-form option')).toHaveCount(2);
    await application(page);
    await expect(page.locator('.application-menu a')).toHaveCount(9);
    await page.locator('.application-menu a[href$="/all-requests"]').click();
    await page
      .getByRole('button', { name: 'Testeinträge erzeugen / ersetzen', exact: true })
      .click();
    await expect(page.locator('.collection-preview > p[role="status"]')).toContainText('18');
    await page.locator('.application-menu a[href$="/all-suppliers"]').click();
    await page
      .getByRole('button', { name: 'Testeinträge erzeugen / ersetzen', exact: true })
      .click();
    await expect(page.locator('.collection-preview > p[role="status"]')).toContainText('10');
    await page.locator('.application-menu a[href$="/all-requests"]').click();
    await expect(page.locator('.collection-preview > p[role="status"]')).toContainText('18');
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'HTML-Vorschau herunterladen', exact: true }).click();
    const download = await pending;
    const destination = info.outputPath('workspace.html');
    await download.saveAs(destination);
    const content = await readFile(destination, 'utf8');
    expect(content).not.toContain('Planned roles:');
    const context = await browser.newContext({ offline: true });
    const preview = await context.newPage();
    await preview.goto(pathToFileURL(destination).href);
    await expect(preview.locator('.application-menu a')).toHaveCount(9);
    await expect(preview.locator('.rendered-form')).toHaveClass(/theme-fluent/);
    await expect(preview.locator('#preview-request-title')).toHaveCSS(
      'border-bottom-color',
      'rgb(97, 97, 97)',
    );
    await preview.locator('.application-menu a[href$="/supplier-directory"]').click();
    await expect(preview.locator('.collection-table tbody')).toContainText(
      'Keine passenden Einträge.',
    );
    await expect(
      preview.getByRole('button', { name: 'Eintrag erstellen', exact: true }),
    ).toHaveCount(0);
    await context.close();
  },
);

test(
  'the three-level gallery is localized, accessible and usable on Persian mobile',
  {
    tag: tagsFor('examples', 'examples-gallery-mobile', { checks: ['a11y', 'responsive', 'i18n'] }),
  },
  async ({ page }, info) => {
    await page.goto('/#examples');
    await expect(page.locator('.example-card')).toHaveCount(3);
    await page.screenshot({ path: info.outputPath('gallery-desktop.png'), fullPage: true });
    for (const [index, card] of (await page.locator('.example-card').all()).entries())
      await card.screenshot({ path: info.outputPath(`card-desktop-${index + 1}.png`) });
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .locator('.topbar .locale-toggle')
      .getByRole('button', { name: 'FA', exact: true })
      .click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('.example-workspace')).toContainText('۳');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: info.outputPath('gallery-mobile-fa.png'), fullPage: true });
    for (const [index, card] of (await page.locator('.example-card').all()).entries())
      await card.screenshot({ path: info.outputPath(`card-mobile-fa-${index + 1}.png`) });
  },
);
