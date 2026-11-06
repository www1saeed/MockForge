import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { pathToFileURL } from 'node:url';
import { parseApplicationProject } from '../src/app/application-project';
import { example } from '../src/app/project.examples';
import { createField, text } from '../src/app/project.model';
import { createCollectionList } from '../src/app/collection.model';
import { ALLOW_RIGHTS } from '../src/app/application-access';
import { openProject, goToStep } from './support/workspace';
import { tagsFor } from './test-tags';

function fixture(): NonNullable<ReturnType<typeof parseApplicationProject>> {
  const p = parseApplicationProject(example('saas'))!,
    f = p.forms[0];
  f.title = text('Auftrag', 'Order', 'سفارش');
  p.languages = ['de', 'en'];
  f.fields = [
    { ...createField('text', 'name'), label: text('Name', 'Name', 'نام') },
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
          { ...createField('text', 'quantity'), label: text('Menge', 'Quantity', 'تعداد') },
        ],
      },
    },
  ];
  f.lists = [
    {
      ...createCollectionList(f.fields, []),
      columns: ['name', 'state', 'items'],
      appearance: {
        design: 'plain',
        density: 'comfortable',
        hover: true,
        stickyHeader: false,
        layout: 'cards',
      },
      columnSettings: [
        {
          fieldId: 'state',
          label: text('', '', ''),
          align: 'start',
          sortable: true,
          display: 'badge',
          badgeColor: 'green',
        },
        {
          fieldId: 'items',
          label: text('', '', ''),
          align: 'start',
          sortable: true,
          display: 'chips',
          badgeColor: 'violet',
          groupFields: ['product', 'quantity'],
        },
      ],
    },
  ];
  f.entries = { count: 2, seed: 11 };
  p.roles = [
    { id: 'editor', label: text('Bearbeitung', 'Editor', 'ویرایشگر'), rights: { ...ALLOW_RIGHTS } },
    {
      id: 'reader',
      label: text('Lesend', 'Reader', 'خواننده'),
      rights: { open: true, view: true, create: false, edit: false, delete: false },
    },
  ];
  p.forms.push({
    ...JSON.parse(JSON.stringify(f)),
    id: 'private',
    title: text('Privat', 'Private', 'خصوصی'),
    access: { reader: { open: false } },
  });
  return p;
}
async function createRecord(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Eintrag erstellen', exact: true }).click();
  const dialog = page.locator('.collection-dialog');
  await dialog.locator('#preview-name').fill('Alpha');
  await dialog.locator('#preview-state').selectOption('0');
  await dialog.locator('[data-field-id="product"]').fill('Notebook');
  await dialog.locator('[data-field-id="quantity"]').fill('2');
  await dialog.locator('.repeat-add').click();
  await dialog.locator('[data-field-id="product"]').nth(1).fill('Pencil');
  await dialog.locator('[data-field-id="quantity"]').nth(1).fill('10');
  await dialog.getByRole('button', { name: 'Eintrag speichern', exact: true }).click();
}

test(
  'role authoring persists inherited form/list overrides and removes obsolete role references',
  {
    tag: tagsFor('roles', 'role-authoring', {
      areas: ['roles', 'authoring', 'persistence', 'review'],
      checks: ['a11y', 'responsive'],
    }),
  },
  async ({ page }, info) => {
    const p = fixture();
    delete p.roles;
    p.forms.pop();
    await openProject(page, p);
    await goToStep(page, 'roles');
    await expect(page.locator('.form-manager')).toHaveCount(0);
    await page.getByRole('button', { name: 'Rolle hinzufügen', exact: true }).click();
    await page.getByRole('textbox', { name: 'Rollenname DE', exact: true }).fill('Lesend');
    const defaults = page.getByRole('group', { name: 'Standardrechte der Rolle', exact: true });
    await defaults.getByRole('checkbox', { name: 'Eintrag erstellen', exact: true }).check();
    const rows = page.locator('.access-matrix tbody tr');
    await rows.nth(0).getByRole('combobox').nth(0).selectOption('deny');
    await rows.nth(1).getByRole('combobox').nth(0).selectOption('allow');
    await expect(rows.nth(1).locator('.effective-right').first()).toHaveText('Effektiv: gesperrt');
    await page.reload();
    await goToStep(page, 'roles');
    await expect(page.locator('#configured-role')).toHaveValue('role-1');
    await expect(
      page.locator('.access-matrix tbody tr').nth(1).getByRole('combobox').first(),
    ).toHaveValue('allow');
    await page
      .getByRole('region', { name: 'Berechtigungsmatrix', exact: true })
      .screenshot({ path: info.outputPath('rights-matrix-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    await page
      .locator('.access-editor')
      .screenshot({ path: info.outputPath('rights-matrix-mobile.png') });
    await page.getByRole('button', { name: 'Rolle hinzufügen', exact: true }).click();
    await page.locator('#configured-role').selectOption('role-1');
    await page.getByRole('button', { name: 'Rolle entfernen', exact: true }).click();
    await page.getByRole('button', { name: 'Ja, löschen', exact: true }).click();
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('mockforge-studio-v1')!),
    );
    expect(saved.roles.map((role: { id: string }) => role.id)).toEqual(['role-2']);
    expect(saved.forms[0].access['role-1']).toBeUndefined();
    expect(saved.forms[0].lists[0].access['role-1']).toBeUndefined();
    expect(saved.review.approvedAt).toBeNull();
  },
);

test(
  'role switching gates direct links and CRUD while retaining shared records and clearing unsaved answers',
  {
    tag: tagsFor('roles', 'role-runtime', {
      areas: ['roles', 'navigation', 'lists', 'persistence'],
      smoke: true,
    }),
  },
  async ({ page }) => {
    const p = fixture();
    await openProject(page, p);
    await page.goto('/#application/list/form-1/list-1');
    await createRecord(page);
    const stored = await page.evaluate(() => localStorage.getItem('mockforge-studio-v1'));
    await page.locator('#preview-role').selectOption('reader');
    await expect(page.getByRole('button', { name: 'Eintrag erstellen', exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByRole('button', { name: 'Bearbeiten', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Löschen', exact: true })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Testeinträge erzeugen / ersetzen', exact: true }),
    ).toBeDisabled();
    await expect(page.locator('.collection-record').first()).toContainText('Alpha');
    await page.getByRole('button', { name: 'Ansehen', exact: true }).click();
    await expect(page.locator('.collection-dialog')).toContainText('Alpha');
    await expect(page.locator('.collection-dialog input')).toHaveCount(0);
    await expect(
      page
        .locator('.collection-dialog')
        .getByRole('button', { name: 'Eintrag speichern', exact: true }),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.evaluate(() => {
      location.hash = '#application/form/private';
    });
    await expect(page.locator('.application-frame h2')).toHaveText('Für diese Rolle gesperrt');
    await expect(page.locator('.application-menu a[href*="private"]')).toHaveCount(0);
    await page.locator('#preview-role').selectOption('editor');
    await expect(page.locator('.application-frame h2')).toHaveText('Privat');
    await page.evaluate(() => {
      location.hash = '#application/form/form-1';
    });
    await page.locator('#preview-name').fill('Unsaved');
    await page.locator('#preview-role').selectOption('reader');
    await expect(page.locator('#preview-name')).toHaveValue('');
    await expect(page.locator('.preview-buttons button.preview-submit')).toHaveCount(0);
    await page.evaluate(() => {
      location.hash = '#application/list/form-1/list-1';
    });
    await expect(page.locator('.collection-record').first()).toContainText('Alpha');
    expect(await page.evaluate(() => localStorage.getItem('mockforge-studio-v1'))).toBe(stored);
  },
);

test(
  'badge colors and labelled repeated-row chips are configurable across layouts and persist',
  {
    tag: tagsFor('roles', 'badge-group-chips', {
      areas: ['lists', 'groups', 'authoring', 'persistence'],
      checks: ['keyboard', 'responsive'],
    }),
  },
  async ({ page }, info) => {
    await openProject(page, fixture());
    await goToStep(page, 'lists');
    await createRecord(page);
    await page
      .getByRole('combobox', { name: 'Badge-Farbe: Status', exact: true })
      .selectOption('red');
    await page
      .getByRole('combobox', { name: 'Badge-Farbe: Positionen', exact: true })
      .selectOption('amber');
    const preview = page.locator('.collection-live-preview');
    for (const layout of ['table', 'cards', 'accordion']) {
      await page
        .getByRole('combobox', { name: 'Darstellungsform', exact: true })
        .selectOption(layout);
      if (layout === 'accordion') await preview.locator('.collection-record > summary').click();
      await expect(preview.locator('.collection-badge[data-badge-color="red"]')).toHaveText(
        'Offen',
      );
      await expect(preview.locator('.collection-group-chip')).toHaveCount(2);
      await expect(preview.locator('.collection-group-chip').first()).toContainText('Artikel');
      await expect(preview.locator('.collection-group-chip').first()).toContainText('Notebook');
      await expect(preview.locator('.collection-group-chip').nth(1)).toContainText('Pencil');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(preview.locator('.collection-group-chips')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await preview
      .locator('.collection-group-chips')
      .first()
      .screenshot({ path: info.outputPath('mobile-group-chips.png') });
    await page.reload();
    await goToStep(page, 'lists');
    await expect(
      page.getByRole('combobox', { name: 'Badge-Farbe: Status', exact: true }),
    ).toHaveValue('red');
    await expect(
      page.getByRole('combobox', { name: 'Badge-Farbe: Positionen', exact: true }),
    ).toHaveValue('amber');
  },
);

test(
  'offline preview retains role rules and colored group chips on Persian mobile without network or storage',
  {
    tag: tagsFor('roles', 'role-offline-rtl', {
      areas: ['roles', 'transfer', 'lists', 'groups'],
      checks: ['a11y', 'responsive', 'i18n'],
    }),
  },
  async ({ page, browser }, info) => {
    const p = fixture();
    p.languages = ['de', 'fa'];
    await openProject(page, p);
    await page.goto('/#application');
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'HTML-Vorschau herunterladen', exact: true }).click();
    const file = info.outputPath('roles.html');
    await (await pending).saveAs(file);
    const context = await browser.newContext({
        offline: true,
        viewport: { width: 390, height: 844 },
      }),
      offline = await context.newPage();
    const errors: string[] = [],
      requests: string[] = [];
    offline.on('pageerror', (e) => errors.push(e.message));
    offline.on('request', (r) => {
      if (/^https?:/.test(r.url())) requests.push(r.url());
    });
    await offline.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('STORAGE_ACCESS');
        },
      });
    });
    await offline.goto(pathToFileURL(file).href + '#application/list/form-1/list-1');
    await expect(offline.locator('#preview-role')).toHaveValue('editor');
    await expect(offline.locator('.collection-record')).toHaveCount(0);
    await offline
      .getByRole('button', { name: 'Testeinträge erzeugen / ersetzen', exact: true })
      .click();
    await expect(offline.locator('.collection-record')).toHaveCount(2);
    await expect(
      offline.locator('.collection-badge[data-badge-color="green"]').first(),
    ).toBeVisible();
    await expect(offline.locator('.collection-group-chip').first()).toBeVisible();
    await offline.locator('#preview-role').selectOption('reader');
    await expect(
      offline.getByRole('button', { name: 'Eintrag erstellen', exact: true }),
    ).toHaveCount(0);
    await offline
      .locator('.standalone-header')
      .getByRole('button', { name: 'FA', exact: true })
      .click();
    await expect(offline.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(offline.locator('#preview-role')).toHaveValue('reader');
    expect(await offline.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (
        await new AxeBuilder({ page: offline })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
    await offline.screenshot({
      path: info.outputPath('offline-roles-chips-fa.png'),
      fullPage: true,
    });
    expect(errors).toEqual([]);
    expect(requests).toEqual([]);
    await offline.reload();
    await expect(offline.locator('#preview-role')).toHaveValue('editor');
    await expect(offline.locator('.collection-record')).toHaveCount(0);
    await context.close();
  },
);

test(
  'role names remain editable drafts through language activation reload and review',
  {
    tag: tagsFor('roles', 'role-review-localized-drafts', {
      areas: ['roles', 'authoring', 'persistence', 'review'],
      checks: ['a11y', 'responsive', 'i18n'],
    }),
  },
  async ({ page }, info) => {
    const p = fixture();
    p.forms.pop();
    p.owner = 'Owner';
    p.questions = '';
    p.roles![0].label.fa = '';
    await openProject(page, p);
    await goToStep(page, 'brief');
    await page.locator('#form-language-en').uncheck();
    await page.locator('#form-language-fa').check();
    expect(
      await page.evaluate(() => JSON.parse(localStorage.getItem('mockforge-studio-v1')!).languages),
    ).toEqual(['de', 'fa']);
    await goToStep(page, 'roles');
    const fa = page.getByRole('textbox', { name: 'Rollenname FA', exact: true });
    await expect(fa).toHaveValue('');
    await expect(fa).toHaveAttribute('aria-invalid', 'true');
    await fa.fill('خرید');
    const de = page.getByRole('textbox', { name: 'Rollenname DE', exact: true });
    await de.fill('');
    await expect(de).toHaveAttribute('aria-invalid', 'true');
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('mockforge-studio-v1')!).roles[0].label.de,
      ),
    ).toBe('');
    await expect(page.locator('#configured-role option:checked')).toHaveText('editor');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    await de.screenshot({ path: info.outputPath('blank-role-name.png') });
    await page.reload();
    await goToStep(page, 'roles');
    await expect(de).toHaveValue('');
    await goToStep(page, 'review');
    await page.locator('#reviewer').fill('Reviewer');
    for (const checkbox of await page.locator('.review-checklist input').all())
      await checkbox.check();
    await expect(
      page.getByRole('button', { name: 'Review dokumentieren', exact: true }),
    ).toBeDisabled();
    await expect(page.getByRole('status').filter({ hasText: 'Rollennamen fehlen' })).toBeVisible();
    await goToStep(page, 'roles');
    await de.fill('Einkauf');
    await goToStep(page, 'review');
    for (const checkbox of await page.locator('.review-checklist input').all())
      await checkbox.check();
    await expect(
      page.getByRole('button', { name: 'Review dokumentieren', exact: true }),
    ).toBeEnabled();
    await page.getByRole('button', { name: 'Review dokumentieren', exact: true }).click();
    await expect(page.locator('.review-record')).toContainText('Reviewer');
  },
);

test(
  'constructor policies inherit correctly and fully denied home stays distinct in app and offline export',
  {
    tag: tagsFor('roles', 'role-review-constructor-denied-home', {
      areas: ['roles', 'navigation', 'authoring', 'transfer'],
    }),
  },
  async ({ page, browser }, info) => {
    const p = fixture();
    p.roles![0].id = 'constructor';
    p.roles![0].label.fa = '';
    p.roles![0].rights.create = false;
    p.forms[0].access = { reader: { open: true } };
    p.forms[0].lists![0].access = { reader: { open: true } };
    await openProject(page, p);
    await goToStep(page, 'roles');
    const rows = page.locator('.access-matrix tbody tr');
    await expect(rows.nth(0).getByRole('combobox').nth(1)).toHaveValue('inherit');
    await expect(rows.nth(1).getByRole('combobox').nth(1)).toHaveValue('inherit');
    await rows.nth(1).getByRole('combobox').nth(1).selectOption('allow');
    await expect(rows.nth(1).locator('.effective-right').nth(1)).toHaveText('Effektiv: erlaubt');
    await rows.nth(1).getByRole('combobox').nth(1).selectOption('inherit');
    await expect(rows.nth(1).locator('.effective-right').nth(1)).toHaveText('Effektiv: gesperrt');
    await page.locator('.topbar').getByRole('button', { name: 'FA', exact: true }).click();
    await page.locator('.access-editor .role-actions .text-button').click();
    await expect(page.locator('.delete-target')).toHaveText('constructor');
    await page.keyboard.press('Escape');
    await page.locator('.topbar').getByRole('button', { name: 'DE', exact: true }).click();
    await page
      .getByRole('group', { name: 'Standardrechte der Rolle', exact: true })
      .getByRole('checkbox', { name: 'Öffnen', exact: true })
      .uncheck();
    await page.goto('/#application');
    await expect(page.locator('.application-frame h2')).toHaveText('Für diese Rolle gesperrt');
    await expect(page.locator('.application-menu a')).toHaveCount(0);
    await page
      .locator('.application-frame')
      .screenshot({ path: info.outputPath('denied-home.png') });
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'HTML-Vorschau herunterladen', exact: true }).click();
    const file = info.outputPath('denied-home.html');
    await (await pending).saveAs(file);
    const context = await browser.newContext({ offline: true }),
      offline = await context.newPage();
    await offline.goto(pathToFileURL(file).href);
    await expect(offline.locator('.application-frame h2')).toHaveText('Für diese Rolle gesperrt');
    await offline.locator('#preview-role').selectOption('reader');
    await expect(offline.locator('.application-frame h2')).toHaveText('Auftrag');
    await context.close();
  },
);
