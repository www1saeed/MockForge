import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { pathToFileURL } from 'node:url';
import { accessPresets } from '../src/app/access-presets';
import { parseApplicationProject } from '../src/app/application-project';
import { example } from '../src/app/project.examples';
import { createField, text } from '../src/app/project.model';
import { createCollectionList } from '../src/app/collection.model';
import { openProject, goToStep } from './support/workspace';
import { tagsFor } from './test-tags';

function fixture(): NonNullable<ReturnType<typeof parseApplicationProject>> {
  const p = parseApplicationProject(example('saas'))!,
    f = p.forms[0],
    presets = accessPresets();
  p.roles = presets.roles;
  p.users = presets.users;
  f.title = text('Auftrag', 'Order', 'سفارش');
  f.fields = [
    { ...createField('text', 'name'), label: text('Name', 'Name', 'نام'), required: true },
    {
      ...createField('text', 'secret'),
      label: text('Geheimnis', 'Secret', 'راز'),
      required: true,
      minLength: 5,
      pattern: '[A-Z]+',
    },
    {
      ...createField('text', 'locked'),
      label: text('Intern', 'Internal', 'داخلی'),
      required: true,
    },
    { ...createField('checkbox', 'approved'), label: text('Freigabe', 'Approval', 'تأیید') },
    {
      ...createField('group', 'items'),
      label: text('Positionen', 'Items', 'اقلام'),
      group: {
        layout: 'table',
        minItems: 1,
        maxItems: 3,
        fields: [
          {
            ...createField('text', 'product'),
            label: text('Artikel', 'Product', 'کالا'),
            required: true,
          },
          {
            ...createField('text', 'code'),
            label: text('Artikelcode', 'Item code', 'کد کالا'),
            required: true,
          },
          {
            ...createField('text', 'private-code'),
            label: text('Privater Code', 'Private code', 'کد خصوصی'),
            required: true,
          },
          { ...createField('number', 'quantity'), label: text('Menge', 'Quantity', 'تعداد') },
        ],
      },
    },
  ];
  const list = {
    ...createCollectionList(f.fields, []),
    columns: ['name', 'secret', 'locked', 'approved', 'items', 'items/private-code'],
    searchFields: ['name', 'secret', 'items'],
    columnSettings: [
      {
        fieldId: 'items',
        label: text('', '', ''),
        align: 'start' as const,
        sortable: true,
        display: 'chips' as const,
        groupFields: ['product', 'code', 'private-code', 'quantity'],
      },
    ],
  };
  f.lists = [
    list,
    {
      ...list,
      id: 'readonly-list',
      title: text('Lesesicht', 'Read only', 'نمای خواندنی'),
      actions: { create: false, view: true, edit: false, delete: false },
    },
  ];
  f.entries = { count: 2, seed: 11 };
  f.fieldAccess = {
    secret: { user: 'hidden', visitor: 'hidden' },
    locked: { user: 'readonly' },
    approved: { user: 'readonly' },
    'items/code': { user: 'readonly' },
    'items/private-code': { user: 'hidden', visitor: 'hidden' },
  };
  return p;
}
async function seed(page: Page, name = 'Alpha', approved = false): Promise<void> {
  await page.locator('#preview-user').selectOption('admin-demo');
  await page.getByRole('button', { name: 'Eintrag erstellen', exact: true }).click();
  const dialog = page.locator('.collection-dialog');
  await dialog.locator('#preview-name').fill(name);
  if (approved) await dialog.locator('#preview-approved').check();
  await dialog.locator('#preview-secret').fill('AAAAA');
  await dialog.locator('#preview-locked').fill('LOCKED');
  await dialog.locator('[data-field-id="product"]').fill('Notebook');
  await dialog.locator('[data-field-id="code"]').fill('SKU');
  await dialog.locator('[data-field-id="private-code"]').fill('PRIVATE');
  await dialog.locator('[data-field-id="quantity"]').fill('2');
  await dialog.getByRole('button', { name: 'Eintrag speichern', exact: true }).click();
}

test(
  'hidden preset fields still constrain in-app and offline lists',
  {
    tag: tagsFor('field-access', 'field-review-hidden-presets', {
      areas: ['roles', 'lists', 'transfer'],
    }),
  },
  async ({ page, browser }, info) => {
    const p = fixture(),
      form = p.forms[0],
      list = form.lists![0];
    form.fieldAccess!.approved = { visitor: 'hidden' };
    list.presets = [{ fieldId: 'approved', value: true }];
    list.filters = ['approved'];
    list.searchFields = ['name', 'approved'];
    await openProject(page, p);
    await page.goto('/#application/list/form-1/list-1');
    const assertPreset = async (target: Page): Promise<void> => {
      await seed(target, 'Included', true);
      await seed(target, 'Excluded', false);
      await target.locator('#preview-user').selectOption('visitor-demo');
      const rows = target.locator('.collection-preview tbody tr:has(app-collection-cell)');
      await expect(rows).toHaveCount(1);
      await expect(rows).toContainText('Included');
      await expect(target.getByRole('columnheader', { name: 'Freigabe', exact: true })).toHaveCount(
        0,
      );
      await target.getByRole('searchbox', { name: 'Suche', exact: true }).fill('Excluded');
      await expect(rows).toHaveCount(0);
      await target.getByRole('searchbox', { name: 'Suche', exact: true }).fill('');
      await expect(rows).toHaveCount(1);
      await target.locator('.application-menu a[href$="readonly-list"]').click();
      await expect(rows).toHaveCount(2);
      await target.locator('.application-menu a[href$="list-1"]').click();
      await expect(rows).toHaveCount(1);
    };
    await assertPreset(page);
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'HTML-Vorschau herunterladen', exact: true }).click();
    const path = info.outputPath('hidden-presets.html');
    await (await pending).saveAs(path);
    const context = await browser.newContext({ offline: true }),
      offline = await context.newPage();
    await offline.goto(pathToFileURL(path).href + '#application/list/form-1/list-1');
    await assertPreset(offline);
    await context.close();
  },
);

test(
  'new mixed-access groups allow optional and required rows while saved rows remain protected',
  {
    tag: tagsFor('field-access', 'field-review-create-rows', {
      areas: ['roles', 'lists', 'forms', 'groups'],
    }),
  },
  async ({ page }) => {
    for (const minimum of [0, 1]) {
      const p = fixture();
      p.forms[0].fields.find((field) => field.id === 'items')!.group!.minItems = minimum;
      await openProject(page, p);
      await page.goto('/#application/list/form-1/list-1');
      await page.locator('#preview-user').selectOption('user-demo');
      await page.getByRole('button', { name: 'Eintrag erstellen', exact: true }).click();
      const dialog = page.locator('.collection-dialog');
      await expect(dialog.locator('.repeat-table tbody tr')).toHaveCount(minimum);
      await expect(dialog.locator('.repeat-add')).toBeEnabled();
      for (let i = minimum; i < 2; i++) await dialog.locator('.repeat-add').click();
      await expect(dialog.locator('.repeat-table tbody tr')).toHaveCount(2);
      await dialog.locator('.repeat-remove').last().click();
      await page.getByRole('button', { name: 'Ja, löschen', exact: true }).click();
      await expect(dialog.locator('.repeat-table tbody tr')).toHaveCount(1);
      await dialog.locator('.repeat-add').click();
      await dialog.locator('#preview-name').fill('Two rows');
      await dialog.locator('[data-field-id="product"]').nth(0).fill('First');
      await dialog.locator('[data-field-id="product"]').nth(1).fill('Second');
      await expect(dialog.locator('[data-field-id="code"]').first()).toBeDisabled();
      await expect(dialog.locator('[data-field-id="private-code"]')).toHaveCount(0);
      await dialog.getByRole('button', { name: 'Eintrag speichern', exact: true }).click();
      await expect(dialog).not.toBeVisible();
      await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
      await expect(dialog.locator('.repeat-table tbody tr')).toHaveCount(2);
      await expect(dialog.locator('.repeat-add')).toBeDisabled();
      for (const button of await dialog.locator('.repeat-remove').all())
        await expect(button).toBeDisabled();
      await expect(dialog.locator('[data-field-id="product"]').nth(1)).toHaveValue('Second');
      await page.keyboard.press('Escape');
    }
  },
);

test(
  'preset users and field inheritance are editable while Admin cannot be downgraded',
  {
    tag: tagsFor('field-access', 'field-authoring', {
      areas: ['roles', 'authoring', 'persistence'],
      checks: ['responsive'],
    }),
  },
  async ({ page }, info) => {
    const p = fixture();
    delete p.roles;
    delete p.users;
    delete p.forms[0].fieldAccess;
    await openProject(page, p);
    await goToStep(page, 'roles');
    await page
      .getByRole('button', { name: 'Besucher / User / Admin hinzufügen', exact: true })
      .click();
    await expect(page.locator('.demo-user')).toHaveCount(3);
    await page.locator('#configured-role').selectOption('admin');
    await expect(
      page
        .getByRole('group', { name: 'Standardrechte der Rolle', exact: true })
        .getByRole('checkbox', { name: 'Eintrag erstellen', exact: true }),
    ).toBeChecked();
    await expect(
      page
        .getByRole('group', { name: 'Standardrechte der Rolle', exact: true })
        .getByRole('checkbox', { name: 'Eintrag erstellen', exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole('combobox', { name: 'Feldrechte: form-1/secret', exact: true }),
    ).toBeDisabled();
    await page.locator('#configured-role').selectOption('user');
    await page
      .getByRole('combobox', { name: 'Feldrechte: form-1/secret', exact: true })
      .selectOption('hidden');
    await page
      .getByRole('combobox', { name: 'Feldrechte: form-1/items', exact: true })
      .selectOption('readonly');
    await page
      .getByRole('combobox', { name: 'Feldrechte: form-1/items/product', exact: true })
      .selectOption('editable');
    const child = page.locator('.field-rights-matrix tbody tr').filter({
      has: page.getByRole('combobox', { name: 'Feldrechte: form-1/items/product', exact: true }),
    });
    await expect(child.locator('td').last()).toHaveText('Nur lesbar');
    await child.screenshot({ path: info.outputPath('field-inheritance.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.reload();
    await goToStep(page, 'roles');
    await page.locator('#configured-role').selectOption('user');
    await expect(
      page.getByRole('combobox', { name: 'Feldrechte: form-1/secret', exact: true }),
    ).toHaveValue('hidden');
    await page
      .getByRole('textbox', { name: 'Benutzername user-demo DE', exact: true })
      .fill('Demo Redaktion');
    await page
      .getByRole('combobox', { name: 'Zugeordnete Rolle user-demo', exact: true })
      .selectOption('visitor');
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('mockforge-studio-v1')!),
    );
    expect(saved.users.find((user: { id: string }) => user.id === 'user-demo')).toMatchObject({
      roleId: 'visitor',
      name: { de: 'Demo Redaktion' },
    });
  },
);

test(
  'hidden and readonly fields stay protected in editors search group details and saved records',
  {
    tag: tagsFor('field-access', 'field-native-protection', {
      areas: ['roles', 'forms', 'lists', 'groups'],
    }),
  },
  async ({ page }) => {
    await openProject(page, fixture());
    await page.goto('/#application/list/form-1/list-1');
    await seed(page);
    await page.locator('#preview-user').selectOption('user-demo');
    await expect(page.locator('.collection-preview')).not.toContainText('Geheimnis');
    await expect(page.locator('.collection-preview')).not.toContainText('PRIVATE');
    await page.getByRole('searchbox', { name: 'Suche', exact: true }).fill('PRIVATE');
    await expect(page.locator('.collection-preview tbody tr:has(app-collection-cell)')).toHaveCount(
      0,
    );
    await page.getByRole('searchbox', { name: 'Suche', exact: true }).fill('');
    await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
    const dialog = page.locator('.collection-dialog');
    await expect(dialog.locator('#preview-secret')).toHaveCount(0);
    await expect(dialog.locator('#preview-locked')).toBeDisabled();
    await expect(dialog.locator('[data-field-id="code"]')).toBeDisabled();
    await expect(dialog.locator('[data-field-id="private-code"]')).toHaveCount(0);
    await expect(dialog.locator('.repeat-add')).toBeDisabled();
    await expect(dialog.locator('.repeat-remove')).toBeDisabled();
    await dialog.locator('#preview-name').fill('Changed');
    await dialog.locator('[data-field-id="product"]').fill('Updated');
    await dialog.locator('#preview-locked').evaluate((node) => {
      const input = node as HTMLInputElement;
      input.disabled = false;
      input.value = 'FORGED';
    });
    await dialog.locator('#preview-approved').evaluate((node) => {
      const input = node as HTMLInputElement;
      input.disabled = false;
      input.checked = true;
    });
    await dialog.getByRole('button', { name: 'Eintrag speichern', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await page.getByRole('button', { name: 'Ansehen', exact: true }).click();
    await expect(dialog).toContainText('Changed');
    await expect(dialog).not.toContainText('Geheimnis');
    await expect(dialog).not.toContainText('PRIVATE');
    await expect(dialog).toContainText('LOCKED');
    await page.keyboard.press('Escape');
    await page.locator('#preview-user').selectOption('admin-demo');
    await page.getByRole('button', { name: 'Ansehen', exact: true }).click();
    await expect(dialog).toContainText('AAAAA');
    await expect(dialog).toContainText('PRIVATE');
    await expect(dialog).toContainText('LOCKED');
    await expect(dialog).not.toContainText('FORGED');
    await page.keyboard.press('Escape');
    await page.locator('#preview-user').selectOption('user-demo');
    await page.getByRole('button', { name: 'Eintrag erstellen', exact: true }).click();
    await dialog.locator('#preview-name').fill('Created');
    await dialog.locator('[data-field-id="product"]').fill('New product');
    await dialog.getByRole('button', { name: 'Eintrag speichern', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('.collection-preview tbody tr:has(app-collection-cell)')).toHaveCount(
      2,
    );
  },
);

test(
  'Admin bypasses screen and field rules while disabled actions remain off and same-role users reset answers',
  {
    tag: tagsFor('field-access', 'field-admin-and-actor-scope', {
      areas: ['roles', 'navigation', 'forms', 'lists', 'persistence'],
    }),
  },
  async ({ page }) => {
    const p = fixture();
    p.forms[0].access = { visitor: { open: false }, user: { open: false }, admin: { open: false } };
    p.forms[0].fieldDefaults = { admin: 'hidden' };
    p.users!.push({ id: 'other-user', name: text('Andere', 'Other', 'دیگر'), roleId: 'user' });
    await openProject(page, p);
    await page.goto('/#application');
    await expect(page.locator('.application-frame h2')).toHaveText('Für diese Rolle gesperrt');
    await page.locator('#preview-user').selectOption('admin-demo');
    await expect(page.locator('#preview-secret')).toBeEnabled();
    await page.evaluate(() => {
      location.hash = '#application/list/form-1/readonly-list';
    });
    await expect(page.getByRole('button', { name: 'Eintrag erstellen', exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByRole('button', { name: 'Bearbeiten', exact: true })).toHaveCount(0);
    const normal = fixture();
    normal.users!.push({ id: 'other-user', name: text('Andere', 'Other', 'دیگر'), roleId: 'user' });
    await openProject(page, normal);
    await page.goto('/#application/form/form-1');
    await page.locator('#preview-user').selectOption('user-demo');
    await page.locator('#preview-name').fill('Unsaved');
    const stored = await page.evaluate(() => localStorage.getItem('mockforge-studio-v1'));
    await page.locator('#preview-user').selectOption('other-user');
    await expect(page.locator('#preview-name')).toHaveValue('');
    expect(await page.evaluate(() => localStorage.getItem('mockforge-studio-v1'))).toBe(stored);
  },
);

test(
  'offline Persian mobile profiles enforce field rights and retain protected repeated values',
  {
    tag: tagsFor('field-access', 'field-offline-rtl', {
      areas: ['roles', 'forms', 'lists', 'groups', 'transfer'],
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
    const file = info.outputPath('field-rights.html');
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
    await expect(offline.locator('#preview-user')).toHaveValue('visitor-demo');
    await seed(offline);
    await offline.locator('#preview-user').selectOption('user-demo');
    await offline.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
    const dialog = offline.locator('.collection-dialog');
    await expect(dialog.locator('#preview-secret')).toHaveCount(0);
    await expect(dialog.locator('#preview-locked')).toBeDisabled();
    await dialog.locator('#preview-name').fill('Offline');
    await dialog.getByRole('button', { name: 'Eintrag speichern', exact: true }).click();
    await offline
      .locator('.standalone-header')
      .getByRole('button', { name: 'FA', exact: true })
      .click();
    await expect(offline.locator('html')).toHaveAttribute('dir', 'rtl');
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
      path: info.outputPath('field-rights-fa-mobile.png'),
      fullPage: true,
    });
    expect(errors).toEqual([]);
    expect(requests).toEqual([]);
    await offline.reload();
    await expect(offline.locator('#preview-user')).toHaveValue('visitor-demo');
    await expect(
      offline.locator('.collection-preview tbody tr:has(app-collection-cell)'),
    ).toHaveCount(0);
    await context.close();
  },
);
