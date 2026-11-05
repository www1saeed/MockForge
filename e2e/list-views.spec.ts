import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { pathToFileURL } from 'node:url';
import { parseApplicationProject } from '../src/app/application-project';
import { example } from '../src/app/project.examples';
import { createField, text } from '../src/app/project.model';
import { createCollectionList } from '../src/app/collection.model';
import { goToStep, openProject } from './support/workspace';
import { tagsFor } from './test-tags';
async function open(page: Page): Promise<void> {
  const p = parseApplicationProject(example('saas'))!;
  p.name = 'Grouped workspace';
  p.forms[0].title = text('Auftrag', 'Order', 'سفارش');
  p.forms[0].fields = [
    { ...createField('text', 'name'), label: text('Name', 'Name', 'نام'), required: true },
    {
      ...createField('select', 'state'),
      label: text('Status', 'State', 'وضعیت'),
      options: [text('Offen', 'Open', 'باز'), text('Fertig', 'Done', 'انجام‌شده')],
    },
    {
      ...createField('group', 'items'),
      label: text('Positionen', 'Items', 'اقلام'),
      group: {
        layout: 'table',
        minItems: 1,
        maxItems: 3,
        fields: [
          { ...createField('text', 'product'), label: text('Artikel', 'Product', 'کالا') },
          { ...createField('number', 'quantity'), label: text('Menge', 'Quantity', 'تعداد') },
        ],
      },
    },
  ];
  p.forms[0].lists = [createCollectionList(p.forms[0].fields, [])];
  p.forms[0].entries = { count: 4, seed: 11 };
  await openProject(page, p);
  await goToStep(page, 'lists');
}
test(
  'group columns and child paths persist across table cards accordion and offline export',
  {
    tag: tagsFor('list-views', 'list-group-columns', {
      areas: ['lists', 'groups', 'transfer', 'authoring'],
    }),
  },
  async ({ page, browser }, info) => {
    await open(page);
    await expect(page.locator('.form-manager')).toHaveCount(0);
    await expect(page.locator('#list-source-form')).toBeVisible();
    await page.getByRole('checkbox', { name: 'Spalte: Positionen', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Spalte: Positionen / Artikel', exact: true }).check();
    await page
      .getByRole('combobox', { name: 'Wertdarstellung: Status', exact: true })
      .selectOption('badge');
    const group = page
      .locator('.collection-column-editor')
      .filter({ has: page.getByRole('heading', { name: /^\d+ · Positionen$/ }) });
    await group.getByRole('checkbox', { name: 'Menge', exact: true }).uncheck();
    const preview = page.locator('.collection-live-preview');
    await expect(preview.locator('.preview-toolbar')).toBeVisible();
    await expect(preview.locator('.test-data-toolbar')).toBeVisible();
    await preview.getByRole('button', { name: 'Eintrag erstellen', exact: true }).click();
    await page.locator('.collection-dialog #preview-name').fill('Order Alpha');
    await page.locator('.collection-dialog #preview-state').selectOption('0');
    await page.locator('.collection-dialog [data-field-id="product"]').fill('Notebook');
    await page.locator('.collection-dialog [data-field-id="quantity"]').fill('3');
    await page
      .locator('.collection-dialog')
      .getByRole('button', { name: 'Eintrag speichern', exact: true })
      .click();
    const trigger = preview.locator('app-collection-cell').nth(2).getByRole('button');
    await trigger.click();
    await expect(page.locator('.collection-group-dialog[open]')).toContainText('Notebook');
    await expect(page.locator('.collection-group-dialog[open]')).not.toContainText('Menge');
    await page.screenshot({ path: info.outputPath('group-details-dialog.png'), fullPage: true });
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(preview.locator('.collection-badge')).toContainText('Offen');
    for (const display of ['cards', 'accordion', 'chips', 'count', 'text', 'table']) {
      await group
        .getByRole('combobox', { name: 'Wertdarstellung: Positionen', exact: true })
        .selectOption(display);
      if (['cards', 'count', 'table'].includes(display)) {
        if (display === 'count')
          await expect(
            preview.locator('app-collection-cell').nth(2).getByRole('button'),
          ).toHaveText('1');
        await preview.locator('app-collection-cell').nth(2).getByRole('button').click();
        await expect(page.locator('.collection-group-dialog[open]')).toContainText('Notebook');
        await page.keyboard.press('Escape');
      } else await expect(preview.locator('app-collection-cell').nth(2)).toContainText('Notebook');
    }
    await group.getByRole('button').first().click();
    await group.getByRole('button').first().click();
    for (const layout of ['cards', 'accordion']) {
      await page
        .getByRole('combobox', { name: 'Darstellungsform', exact: true })
        .selectOption(layout);
      if (layout === 'accordion') {
        await expect(preview.locator('.collection-record > summary')).toHaveText('Notebook');
        await preview.locator('.collection-record > summary').click();
      }
      await expect(preview.locator('.collection-record')).toContainText('Order Alpha');
      await preview.locator('.collection-record .collection-group-trigger').click();
      await expect(
        page.locator('.collection-group-dialog[open] .collection-group-table'),
      ).toContainText('Notebook');
      await page.keyboard.press('Escape');
      await page.screenshot({ path: info.outputPath('list-' + layout + '.png'), fullPage: true });
    }
    await page.getByRole('button', { name: 'Vorschau ausblenden', exact: true }).click();
    await expect(preview).toHaveCount(0);
    await page.getByRole('button', { name: 'Vorschau in voller Breite', exact: true }).click();
    await expect(page.locator('.collection-editor')).not.toBeVisible();
    await expect(page.locator('.collection-live-preview')).toBeVisible();
    await page.getByRole('button', { name: 'Zurück zum Editor', exact: true }).click();
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('mockforge-studio-v1')!),
    );
    expect(saved.forms[0].lists[0].columns).toContain('items/product');
    await page.reload();
    await goToStep(page, 'lists');
    await expect(page.getByRole('combobox', { name: 'Darstellungsform', exact: true })).toHaveValue(
      'accordion',
    );
    await page.goto('/#application');
    const pending = page.waitForEvent('download');
    await page.locator('.application-intro button').click();
    const destination = info.outputPath('grouped.html');
    await (await pending).saveAs(destination);
    const context = await browser.newContext({ offline: true });
    const app = await context.newPage();
    await app.goto(pathToFileURL(destination).href);
    await app.locator('.application-menu a[href*="/list/"]').click();
    await app
      .getByRole('button', { name: 'Einzelnen Testeintrag hinzufügen', exact: true })
      .click();
    await expect(app.locator('.collection-record')).toHaveCount(1);
    await app.locator('.collection-record > summary').click();
    await app.locator('.collection-record .collection-group-trigger').click();
    await expect(
      app.locator('.collection-group-dialog[open] .collection-group-table'),
    ).toBeVisible();
    await app.keyboard.press('Escape');
    await context.close();
  },
);
test(
  'selected and mixed data languages control replacement and single append without persisting answers',
  {
    tag: tagsFor('list-views', 'list-data-languages', {
      areas: ['lists', 'test-data', 'preview'],
      checks: ['i18n'],
    }),
  },
  async ({ page }) => {
    await open(page);
    const stored = await page.evaluate(() => localStorage.getItem('mockforge-studio-v1'));
    const preview = page.locator('.collection-live-preview');
    await preview
      .locator('.preview-toolbar')
      .getByRole('button', { name: 'EN', exact: true })
      .click();
    await preview
      .getByRole('button', { name: 'Testeinträge erzeugen / ersetzen', exact: true })
      .click();
    await expect(preview.locator('tbody tr')).toHaveCount(4);
    await expect(preview.locator('tbody')).toContainText(/Sample|Example/);
    await expect(preview.locator('tbody')).not.toContainText(/Muster|Beispiel/);
    await preview.getByRole('button', { name: 'Testdaten-Einstellungen', exact: true }).click();
    await preview
      .getByRole('combobox', { name: 'Sprache der Testinhalte', exact: true })
      .selectOption('mixed');
    await preview
      .getByRole('button', { name: 'Testeinträge erzeugen / ersetzen', exact: true })
      .click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Ja, löschen', exact: true })
      .click();
    await expect(preview.locator('tbody')).toContainText(/Muster|Beispiel/);
    await expect(preview.locator('tbody')).toContainText(/Sample|Example/);
    await preview
      .getByRole('combobox', { name: 'Sprache der Testinhalte', exact: true })
      .selectOption('de');
    await preview
      .getByRole('button', { name: 'Einzelnen Testeintrag hinzufügen', exact: true })
      .click();
    await expect(preview.locator('tbody tr')).toHaveCount(5);
    await expect(preview.locator('tbody tr').last()).toContainText(/Muster|Beispiel/);
    const before = await page.evaluate(() => localStorage.getItem('mockforge-studio-v1'));
    expect(before).toBe(stored);
    await page.reload();
    await goToStep(page, 'lists');
    await expect(page.locator('.collection-preview')).toContainText('0 Einträge');
  },
);
test(
  'Persian mobile list toolbar and grouped accordion remain accessible and bounded',
  {
    tag: tagsFor('list-views', 'list-group-mobile', {
      areas: ['lists', 'groups', 'preview'],
      checks: ['a11y', 'responsive', 'i18n', 'keyboard'],
    }),
  },
  async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    await page.getByRole('checkbox', { name: 'Spalte: Positionen', exact: true }).check();
    await page
      .getByRole('combobox', { name: 'Darstellungsform', exact: true })
      .selectOption('accordion');
    await page.locator('.topbar').getByRole('button', { name: 'FA', exact: true }).click();
    const preview = page.locator('.collection-live-preview');
    await preview
      .locator('.preview-toolbar')
      .getByRole('button', { name: 'EN', exact: true })
      .click();
    await preview.locator('.collection-fixtures .secondary-button').first().click();
    await expect(preview.locator('.collection-record')).toHaveCount(4);
    await preview.locator('.collection-record > summary').first().focus();
    await page.keyboard.press('Enter');
    await expect(preview.locator('.collection-record[open]')).toHaveCount(1);
    const groupTrigger = preview.locator('.collection-record[open] .collection-group-trigger');
    await groupTrigger.click();
    await expect(page.locator('.collection-group-dialog[open]')).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: info.outputPath('group-dialog-mobile-fa.png'), fullPage: true });
    await page.keyboard.press('Escape');
    await expect(groupTrigger).toBeFocused();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath('list-mobile-fa.png'), fullPage: true });
  },
);

test(
  'list options match layout, counts stay synchronized and the preview scrolls independently',
  {
    tag: tagsFor('list-views', 'list-usability', {
      areas: ['lists', 'authoring', 'preview', 'test-data'],
      checks: ['a11y', 'responsive'],
    }),
  },
  async ({ page }, info) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    const preview = page.locator('.collection-live-preview');
    await expect(page.getByRole('heading', { name: 'Listenvorschau', exact: true })).toHaveCount(0);
    const defaults = page
      .locator('#list-config-fixtures')
      .getByRole('spinbutton', { name: 'Anzahl Testeinträge', exact: true });
    await preview.getByRole('button', { name: 'Testdaten-Einstellungen', exact: true }).click();
    const count = preview
      .locator('.collection-data-settings')
      .getByRole('spinbutton', { name: 'Anzahl Testeinträge', exact: true });
    await count.fill('12');
    await expect(defaults).toHaveValue('12');
    await defaults.fill('3');
    await expect(count).toHaveValue('3');
    const generate = preview.getByRole('button', {
      name: 'Testeinträge erzeugen / ersetzen',
      exact: true,
    });
    await generate.click();
    await expect(preview.locator('.collection-table > tbody > tr')).toHaveCount(3);
    await count.fill('0');
    await expect(generate).toBeDisabled();
    await count.fill('');
    await expect(generate).toBeDisabled();
    await count.fill('18');
    await expect(defaults).toHaveValue('18');
    await page.getByRole('spinbutton', { name: 'Einträge pro Seite', exact: true }).fill('50');
    await generate.click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Ja, löschen', exact: true })
      .click();
    await expect(preview.locator('.collection-table > tbody > tr')).toHaveCount(18);
    await preview.evaluate((el) => (el.scrollTop = 0));
    await preview.hover();
    const mainScroll = await page.locator('#main-content').evaluate((el) => el.scrollTop);
    expect(await preview.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    await page.mouse.wheel(0, 500);
    await expect.poll(() => preview.evaluate((el) => el.scrollTop)).toBeGreaterThan(100);
    expect(await page.locator('#main-content').evaluate((el) => el.scrollTop)).toBe(mainScroll);
    const name = page.getByRole('combobox', { name: 'Wertdarstellung: Name', exact: true });
    await expect(name.locator('option[value="chips"]')).toHaveCount(0);
    await expect(name.locator('option[value="count"]')).toHaveCount(0);
    await page.getByRole('checkbox', { name: 'Spalte: Positionen', exact: true }).check();
    const group = page
      .locator('.collection-column-editor')
      .filter({ has: page.getByRole('heading', { name: /^3 · Positionen$/ }) });
    expect(
      await group
        .locator('.collection-group-field-settings label')
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).gap)),
    ).toBeGreaterThanOrEqual(8);
    await page
      .getByRole('combobox', { name: 'Darstellungsform', exact: true })
      .selectOption('cards');
    await expect(page.locator('.collection-designs')).toHaveCount(0);
    await expect(
      page.getByRole('spinbutton', { name: 'Breite in Pixeln · 80–600', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('checkbox', { name: 'Kopfzeile beim Scrollen festhalten', exact: true }),
    ).toHaveCount(0);
    const record = preview.locator('.collection-record').first();
    const comfortable = await record.evaluate((el) => parseFloat(getComputedStyle(el).paddingTop));
    await page.getByRole('combobox', { name: 'Zeilendichte', exact: true }).selectOption('compact');
    expect(await record.evaluate((el) => parseFloat(getComputedStyle(el).paddingTop))).toBeLessThan(
      comfortable,
    );
    await page
      .getByRole('checkbox', { name: 'Zeile unter dem Zeiger hervorheben', exact: true })
      .uncheck();
    await expect(preview.locator('.collection-records')).not.toHaveClass(/records-hover/);
    await page
      .locator('.collection-column-editor')
      .first()
      .getByRole('combobox', { name: 'Ausrichtung', exact: true })
      .selectOption('end');
    await expect(record.locator('dd').first()).toHaveCSS('text-align', 'end');
    await page
      .getByRole('combobox', { name: 'Darstellungsform', exact: true })
      .selectOption('accordion');
    await expect(preview.locator('.collection-records')).toHaveClass(/records-compact/);
    await page
      .getByRole('combobox', { name: 'Darstellungsform', exact: true })
      .selectOption('table');
    await expect(page.locator('.collection-designs')).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await preview.evaluate((el) => (el.scrollTop = 0));
    await preview.screenshot({ path: info.outputPath('list-preview-scroll.png') });
  },
);
