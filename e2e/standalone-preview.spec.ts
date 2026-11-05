import { test, expect, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { example, createField, text } from '../src/app/project';
import { ApplicationProject, parseApplicationProject } from '../src/app/application-project';
import { createCollectionList } from '../src/app/collection.model';
import { openProject } from './support/workspace';
import { tagsFor } from './test-tags';

async function downloadPreview(
  page: Page,
  destination: string,
  configure?: (project: ApplicationProject) => void,
): Promise<string> {
  const project = parseApplicationProject(example('saas'))!;
  project.owner = 'PRIVATE_OWNER_SENTINEL';
  project.forms[0].fields = [
    {
      ...createField('text', 'name'),
      label: text('Name', 'Name', 'نام'),
      required: true,
      pattern: '(?:[A-Z][a-z]+)',
    },
  ];
  const list = createCollectionList(project.forms[0].fields, []);
  list.actions = { create: true, view: true, edit: true, delete: true };
  project.forms[0].lists = [list];
  project.forms[0].entries = { count: 3, seed: 1 };
  configure?.(project);
  await openProject(page, project);
  await page.goto('/#application');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'HTML-Vorschau herunterladen', exact: true }).click();
  const download = await pending;
  await download.saveAs(destination);
  return pathToFileURL(destination).href;
}

test(
  'download opens offline from file with isolated records, CRUD, worker checks and route recovery',
  {
    tag: tagsFor('standalone-preview', 'standalone-offline-crud', {
      areas: ['transfer', 'navigation', 'lists', 'patterns'],
    }),
  },
  async ({ page, browser }, info) => {
    const destination = info.outputPath('preview.html');
    // Populate the source session before exporting: neither saved records nor answers transfer.
    await downloadPreview(page, info.outputPath('empty-preview.html'));
    const url = pathToFileURL(destination).href;
    await page.locator('.application-menu a[href*="/list/"]').click();
    await page.getByRole('button', { name: 'Eintrag erstellen', exact: true }).click();
    await page
      .locator('.collection-dialog')
      .getByLabel('Name', { exact: false })
      .fill('Sourcesession');
    await page.getByRole('button', { name: 'Eintrag speichern', exact: true }).click();
    await expect(page.locator('.collection-dialog')).not.toBeVisible();
    await page.locator('.application-menu a[href*="/form/"]').click();
    await page.locator('#preview-name').fill('Unsavedanswer');
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'HTML-Vorschau herunterladen', exact: true }).click();
    await (await pending).saveAs(destination);
    const html = await readFile(destination, 'utf8');
    for (const secret of ['PRIVATE_OWNER_SENTINEL', 'Sourcesession', 'Unsavedanswer'])
      expect(html).not.toContain(secret);
    const context = await browser.newContext({ offline: true });
    const preview = await context.newPage();
    const errors: string[] = [],
      requests: string[] = [];
    preview.on('pageerror', (error) => errors.push(error.message));
    preview.on('request', (request) => {
      if (/^https?:/.test(request.url())) requests.push(request.url());
    });
    await preview.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('STORAGE_ACCESSED');
        },
      });
    });
    await preview.goto(url);
    await expect(preview.locator('.application-frame h2')).toBeVisible();
    await expect(preview.getByRole('link', { name: 'Zurück zum Editor' })).toHaveCount(0);
    await preview.locator('.application-menu a[href*="/list/"]').click();
    await expect(preview.locator('.collection-table tbody')).not.toContainText('Sourcesession');
    await preview.getByRole('button', { name: 'Eintrag erstellen', exact: true }).click();
    const dialog = preview.locator('.collection-dialog');
    await dialog.getByLabel('Name', { exact: false }).fill('Ada');
    await dialog.getByRole('button', { name: 'Eintrag speichern', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(preview.locator('.collection-table tbody')).toContainText('Ada');
    await preview.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
    await dialog.getByLabel('Name', { exact: false }).fill('Grace');
    await dialog.getByRole('button', { name: 'Eintrag speichern', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(preview.locator('.collection-table tbody')).toContainText('Grace');
    await preview.locator('.application-menu a[href*="/form/"]').click();
    await preview.goBack();
    await expect(preview.locator('.collection-table tbody')).toContainText('Grace');
    await preview.getByRole('button', { name: 'Löschen', exact: true }).click();
    await preview.locator('.delete-confirm-button').click();
    await expect(preview.locator('.collection-table tbody')).not.toContainText('Grace');
    await preview
      .getByRole('button', { name: 'Testeinträge erzeugen / ersetzen', exact: true })
      .click();
    await expect(preview.locator('.collection-table tbody tr')).toHaveCount(3);
    await preview.reload();
    await expect(preview.locator('.collection-table tbody')).not.toContainText('Grace');
    await expect(preview.locator('.collection-table tbody tr')).toHaveCount(1);
    await preview.evaluate(() => {
      location.hash = 'application/form/missing';
    });
    await expect(preview.locator('.application-frame h2')).toHaveText(
      'Diese Seite wurde nicht gefunden',
    );
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
    await context.close();
  },
);

test(
  'offline Persian mobile preview keeps controls accessible and contains author HTML as text',
  {
    tag: tagsFor('standalone-preview', 'standalone-persian-mobile', {
      checks: ['a11y', 'responsive', 'i18n'],
    }),
  },
  async ({ page, browser }, info) => {
    const hostile = '</script><script>window.INJECTED=true</script><img src=x onerror="alert(1)">';
    const url = await downloadPreview(page, info.outputPath('preview.html'), (project) => {
      project.name = hostile;
    });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      offline: true,
    });
    const preview = await context.newPage();
    await preview.goto(url);
    await expect(preview.locator('.application-intro h1')).toHaveText(hostile);
    expect(await preview.evaluate(() => Reflect.get(window, 'INJECTED'))).toBeUndefined();
    await preview.getByRole('button', { name: 'FA', exact: true }).click();
    await expect(preview.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(preview.locator('html')).toHaveAttribute('lang', 'fa');
    expect(await preview.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect((await new AxeBuilder({ page: preview }).analyze()).violations).toEqual([]);
    await preview.screenshot({ path: info.outputPath('persian-mobile.png'), fullPage: true });
    await context.close();
  },
);

test(
  'offline workers time out safely and repeat rows survive locale changes',
  {
    tag: tagsFor('standalone-preview', 'standalone-worker-groups', {
      areas: ['patterns', 'groups', 'transfer'],
    }),
  },
  async ({ page, browser }, info) => {
    const url = await downloadPreview(page, info.outputPath('preview.html'), (project) => {
      const group = createField('group', 'people');
      group.group!.minItems = 1;
      project.forms[0].fields = [{ ...createField('textarea', 'evil'), pattern: '(a+)+$' }, group];
      // Lists reference only their form's top-level leaves.
      project.forms[0].lists = [createCollectionList(project.forms[0].fields, [])];
      project.forms.push({
        ...project.forms[0],
        id: 'hidden',
        menu: false,
        title: text('Verstecktes Formular', 'Hidden form', 'فرم پنهان'),
        fields: [
          {
            ...createField('text', 'evil'),
            label: text('Eigenes Feld', 'Own field', 'فیلد مستقل'),
          },
        ],
        lists: [],
      });
    });
    const context = await browser.newContext({ offline: true });
    const preview = await context.newPage();
    await preview.goto(url);
    const input = preview.locator('#preview-evil');
    await input.fill('a'.repeat(500) + '!');
    await preview.locator('.test-data-toolbar .text-button').click();
    await expect(preview.locator('.test-data-dialog')).toBeVisible();
    await preview.keyboard.press('Escape');
    await expect(input).toHaveJSProperty(
      'validationMessage',
      'RegEx-Prüfung hat das Zeitlimit erreicht.',
    );
    await preview.locator('.preview-buttons button').first().click();
    await expect(preview.locator('.simulation-result')).toHaveCount(0);
    await input.fill('aaa');
    await expect(input).toHaveJSProperty('validationMessage', '');
    await preview.locator('.repeat-add').click();
    await expect(preview.locator('.repeat-card')).toHaveCount(2);
    await preview
      .locator('.standalone-header')
      .getByRole('button', { name: 'EN', exact: true })
      .click();
    await expect(preview.locator('.repeat-card')).toHaveCount(2);
    await expect(input).toHaveValue('aaa');
    await preview.screenshot({ path: info.outputPath('desktop.png'), fullPage: true });
    await expect(preview.locator('.application-menu a[href*="/form/"]')).toHaveCount(1);
    await preview.evaluate(() => {
      location.hash = 'application/form/hidden';
    });
    await expect(preview.locator('.application-frame h2')).toHaveText('Hidden form');
    await expect(input).toHaveValue('');
    await expect(input).toHaveAttribute('type', 'text');
    await preview.goBack();
    await expect(preview.locator('.repeat-card')).toHaveCount(1);
    await context.close();
  },
);
