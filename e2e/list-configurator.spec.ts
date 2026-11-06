import { expect, test, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { pathToFileURL } from 'node:url';
import { example } from '../src/app/project.examples';
import { createField, text } from '../src/app/project.model';
import { parseApplicationProject } from '../src/app/application-project';
import { createCollectionList } from '../src/app/collection.model';
import { openProject, goToStep } from './support/workspace';
import { tagsFor } from './test-tags';
async function open(page: Page): Promise<void> {
  const project = parseApplicationProject(example('saas'))!;
  project.name = 'Contact workspace';
  project.forms[0].title = text('Kontakt', 'Contact', 'تماس');
  project.forms[0].fields = [
    { ...createField('text', 'name'), label: text('Name', 'Name', 'نام'), required: true },
    { ...createField('email', 'email'), label: text('E-Mail', 'Email', 'ایمیل'), required: true },
  ];
  project.forms[0].lists = [createCollectionList(project.forms[0].fields, [])];
  await openProject(page, project);
}

test(
  'merged project settings and dedicated list editor persist column design and accessible action buttons',
  {
    tag: tagsFor('list-configurator', 'list-configurator-persistence', {
      areas: ['authoring', 'lists', 'transfer'],
    }),
  },
  async ({ page }, info) => {
    await open(page);
    await expect(page.locator('.workflow button')).toHaveCount(5);
    await goToStep(page, 'brief');
    await expect(page.locator('#project-name')).toBeVisible();
    await expect(page.locator('#title-de')).toBeVisible();
    await expect(page.locator('.theme-grid')).toBeVisible();
    await goToStep(page, 'lists');
    await page.getByRole('button', { name: 'Gestreift', exact: true }).click();
    await page.getByLabel('Zeilendichte', { exact: true }).selectOption('compact');
    const column = page.locator('.collection-column-editor').first();
    await column.getByLabel('Spaltenüberschrift · DE', { exact: true }).fill('Kontaktname');
    await column.getByLabel('Breite in Pixeln · 80–600', { exact: true }).fill('180');
    await column.getByLabel('Ausrichtung', { exact: true }).selectOption('end');
    await column.getByLabel('Sortierung erlauben', { exact: true }).uncheck();
    const action = page
      .locator('.collection-action-editor')
      .filter({ has: page.getByRole('heading', { name: 'Bearbeiten', exact: true }) });
    await action.getByLabel('Button-Beschriftung · DE', { exact: true }).fill('Anpassen');
    await action.getByLabel('Darstellung', { exact: true }).selectOption('icon');
    await action.getByLabel('Symbol', { exact: true }).selectOption('arrow');
    const preview = page.locator('.collection-live-preview');
    await expect(preview.locator('table')).toHaveClass(/table-striped/);
    await expect(preview.locator('table')).toHaveClass(/table-compact/);
    await expect(preview.getByRole('button', { name: 'Kontaktname', exact: true })).toHaveCount(0);
    await expect(preview.locator('thead')).toContainText('Kontaktname');
    await preview.getByRole('button', { name: 'Eintrag erstellen', exact: true }).click();
    await page.locator('.collection-dialog #preview-name').fill('Ada Example');
    await page.locator('.collection-dialog #preview-email').fill('ada@example.org');
    await page
      .locator('.collection-dialog')
      .getByRole('button', { name: 'Eintrag speichern', exact: true })
      .click();
    await expect(preview.getByRole('button', { name: 'Anpassen', exact: true })).toBeVisible();
    await expect(
      preview.getByRole('button', { name: 'Anpassen', exact: true }).locator('svg'),
    ).toHaveCount(1);
    await expect(preview.getByRole('button', { name: 'Anpassen', exact: true })).toHaveText('');
    for (const section of ['appearance', 'columns', 'actions']) {
      await page.locator('#list-config-' + section).scrollIntoViewIfNeeded();
      await page.screenshot({
        path: info.outputPath('list-editor-' + section + '.png'),
        fullPage: true,
      });
    }
    await page.screenshot({ path: info.outputPath('list-builder-desktop.png'), fullPage: true });
    await page.reload();
    await goToStep(page, 'lists');
    await expect(page.getByRole('button', { name: 'Gestreift', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(
      page
        .locator('.collection-column-editor')
        .first()
        .getByLabel('Spaltenüberschrift · DE', { exact: true }),
    ).toHaveValue('Kontaktname');
    await page.goto('/#application');
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'HTML-Vorschau herunterladen', exact: true }).click();
    const destination = info.outputPath('configured.html');
    await (await pending).saveAs(destination);
    const context = await page.context().browser()!.newContext({ offline: true });
    const standalone = await context.newPage();
    await standalone.goto(pathToFileURL(destination).href);
    await expect(standalone.locator('.standalone-title')).toContainText('Contact workspace');
    await expect(standalone.locator('.application-sidebar')).toBeVisible();
    await expect(standalone.locator('.preview-toolbar')).toHaveCount(0);
    await expect(standalone.locator('.browser-bar')).not.toBeVisible();
    await standalone.locator('.application-menu a[href*="/list/"]').click();
    await expect(standalone.locator('table')).toHaveClass(/table-striped/);
    await expect(standalone.locator('thead')).toContainText('Kontaktname');
    await standalone.screenshot({
      path: info.outputPath('standalone-sidebar-desktop.png'),
      fullPage: true,
    });
    await context.close();
  },
);

test(
  'Persian mobile configuration fits and offline sidebar opens and closes with keyboard-friendly navigation',
  {
    tag: tagsFor('list-configurator', 'list-configurator-mobile', {
      checks: ['a11y', 'responsive', 'i18n', 'keyboard'],
    }),
  },
  async ({ page, browser }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    await goToStep(page, 'lists');
    await page
      .locator('.topbar .locale-toggle')
      .getByRole('button', { name: 'FA', exact: true })
      .click();
    await expect(page.locator('.collection-builder')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: info.outputPath('list-builder-mobile-fa.png'), fullPage: true });
    await page.goto('/#application');
    const pending = page.waitForEvent('download');
    await page.locator('.application-intro button').click();
    const destination = info.outputPath('mobile.html');
    await (await pending).saveAs(destination);
    const context = await browser.newContext({
      offline: true,
      viewport: { width: 390, height: 844 },
    });
    const preview = await context.newPage();
    await preview.goto(pathToFileURL(destination).href);
    const toggle = preview.locator('.application-menu-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.focus();
    await preview.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await preview.locator('.application-menu a[href*="/list/"]').click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(preview.locator('.application-frame h2')).toBeFocused();
    expect((await new AxeBuilder({ page: preview }).analyze()).violations).toEqual([]);
    expect(await preview.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await preview.screenshot({
      path: info.outputPath('standalone-sidebar-mobile-fa.png'),
      fullPage: true,
    });
    await context.close();
  },
);
